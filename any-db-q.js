////////////////////////////////////////////////////////////////////////////
///                           Part of any-db-q                           ///
////////////////////////////////////////////////////////////////////////////
/// \file any-db-q.js
/// \author Jamie Terry
/// \date 2017/07/28
/// \brief Main file for any-db-q, wraps the any-db library to provide an
/// interface using promises, via the Q library
////////////////////////////////////////////////////////////////////////////

"use strict";

let Q        = require('q');
Q.longStackSupport = true; // :TODO: remove
let begin_tx = require('any-db-transaction');
let AnyDb    = require('any-db');

/*

/////////////////////////////////////////////////////////////////////
/// \brief Begins a transaction and returns promise that resolves to
/// transaction object
/////////////////////////////////////////////////////////////////////
function _beginPromised(dbh){
	return function(){
		let defer = Q.defer();
		begin_tx(dbh._connection, { autoRollback: false }, (err, tx) => {
			if(err){ defer.reject(err); return; }

			let result = (_promisfyConnection(tx));

			function wrapper(func_name){
				return function(){
					let defer = Q.defer();
					tx[func_name]((err) => {
						if(err){
							defer.reject(err);
						} else {
							defer.resolve(dbh);
						}
					});
					return defer.promise;
				};
			}

			result.commit   = wrapper('commit'  );
			result.rollback = wrapper('rollback');

			defer.resolve(result);
		});

		return defer.promise;
	};
}

/////////////////////////////////////////////////////////////////////
/// \brief Performs some set of operations inside a transaction
/// which is automatically committed unless promise is rejected,
/// in which case it is rolled back
/////////////////////////////////////////////////////////////////////
function _doOpsInTransaction(dbh){
	return function(operations){
		return dbh.begin().then((dbh) => {
			return operations(dbh)
				.then(() => {
					return dbh.commit();
				})
				.fail((err) => {
					return dbh.rollback();
				});
		});
	};
}*/

function _generateCloseMethod(dbh){
	if(dbh._connection !== undefined){
		//then this is a transaction, close the connection behind it
		return _generateCloseMethod(dbh._connection);
	}

	// Otherwise try and identify the connection's close method
	if(dbh.close !== undefined){
		// Then its a pool, close it as normal
		return function(){
			return dbh.close();
		};
	} else if(dbh.destroy !== undefined) {
		// Then its a MySQL standalone connection, call destroy to close
		return function(){
			return dbh.destroy();
		};
	} else if (dbh._db !== undefined && dbh._db.close !== undefined) {
		// Then is a sqlite3 connection
		return function() {
			// :TODO: this results in a segfault - bug with underlying library?
			// however sqlite3 connection doesn't keep the app alive like a mysql
			// one, so closing it isnt as vital...

			//dbh._db.close((err, result) => {
			//	console.log("Closed sqlite3 connection, err:");
			//	console.log(err);
			//	console.log("result:");
			//	console.log(result);
			//});
		};
	} else {
		console.log("Can't determine how to close the connection: ");
		console.dir(dbh);
		throw "Unsupported database adapter - cannot be closed";
	}
}

///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

function ConnectionPromise(queryable){
	let defer = Q.defer();

	this._connection = null;
	this._promise    = defer.promise;

	let doCloseConnection = () => {};

	if(typeof queryable.acquire === 'function'){
		// Then its a pool of connections, grab one
		queryable.acquire((err, conn) => {
			if(err){
				defer.reject(err);
				return;
			}

			this._connection = conn;
			defer.resolve(conn); // :TODO: shouldn't we resolve with this?
		});

		doCloseConnection = () => {
			queryable.release(this._connection);
		};
	} else {
		// Then its some other queryable (single connection, transaction, etc)
		this._connection = queryable;

		doCloseConnection = () => {
			if(typeof this._connection.commit === 'function'){
				this._connection.commit();
			}
			_generateCloseMethod(this._connection)();
		};

		defer.resolve(queryable); // :TODO: shouldn't we resolve with this?
	}

	this.close = function() {
		this._promise = this._promise.then(() => {
			if(this._connection == null){
				// :TODO: should this be an error?
				// Note that done() calls this method -> we don't want
				// to make .close().done() cause error
				// But not sure if it works for done() to do check,
				// since both methods will try to assign value to this._promise
				return;
			}
			doCloseConnection();
			this._connection = null;
		});
		return this;
	};
}

ConnectionPromise.prototype.query = function(){
		let args = arguments; // capture arguments to function
		this._promise = this._promise.then(() =>
			Q.nfapply(this._connection.query.bind(this._connection), args)
		);
		return this;
	};

ConnectionPromise.prototype.fail = function(onRejected){
	this._promise = this._promise.fail(onRejected);
	return this;
};
ConnectionPromise.prototype.catch = ConnectionPromise.prototype.catch;

ConnectionPromise.prototype.then = function(onFulfilled, onRejected, onProgress){
	this._promise = this._promise.then(onFulfilled, onRejected, onProgress);
	return this;
};

ConnectionPromise.prototype.done = function(onFulfilled, onRejected, onProgress){
	this.close();
	this._promise = this._promise
		.done(onFulfilled, onRejected, onProgress);

	return this;
};

///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

function ConnectionPool(options){
	if(options.min_connections == null && options.max_connections == null){
		options.min_connections = 1;
		options.max_connections = 1;
	}

	if(options.min_connections == null || options.max_connections == null){
		throw new Error("Must either specify both of 'min_connections' and 'max_connections' or neither");
	}

	if(options.min_connections > options.max_connections){
		throw (new Error("Cannot create connection pool." +
		                 "Minimum number of connections must be less than the maximum"
		                )
		      );
	}

	if(options.adapter          === 'sqlite3' &&
		 options.host             ==  null      &&
		 options.database         ==  null      &&
		 options.min_connections  !=  1         &&
		 options.max_connections  !=  1         &&
		 !options.force_sqlite3_pool){

		throw (
			new Error("Attempted to connect to sqlite3 in memory database as a pool.\n" +
					      "Each connection would have its own distinct in memory database, " +
					      "between which no data would be shared.\n" +
			          "This probably isn't what you intended. If it is, set " +
			          "'connection_options.force_sqlite3_pool' to a truthy value.")
		);
	}

	this._pool = AnyDb.createPool(options,
	                              { min: options.min_connections,
	                                max: options.max_connections
	                              }
	                             );

	this.getAdapter = function(){
		return options.adapter;
	};

	return this;
}

/////////////////////////////////////////////////////////////////////
/// \brief Retrieves a connection from the pool
/// \return Promise which resolves to a database connection as soon
/// as one becomes available
/////////////////////////////////////////////////////////////////////
ConnectionPool.prototype.getConnection = function(){
	// any-db allows you to just call "query" on the connection pool, causing the
	// query to be executed on the first available connection.
	// Instead we want to provide an explicit getConnection method so in typically
	// web application
	// we can:
	// - get connection for the request
	// - do some db operations
	// - send response to client
	// - do some db operations
	// - close the connection
	//
	// We can model this using a transaction, since using a transaction forces
	// a single connection to be used
	//
	// This is nessacery since we don't want to create one huge promise chain that
	// spans multiple requests, but instead create a promise for each request
	let result = new ConnectionPromise(this._pool);

	result.getPool = () => {
		return this;
	};

	return result;
};

/////////////////////////////////////////////////////////////////////
/// \brief Closes all active connections, should be called when the
/// application wants to exit since live connections will keep the
/// process running.
///
/// Note that the promise for all active connections will be fully
/// executed before the connections are closed, hence this function
/// will not interrupt any on-going operations. Each individual
/// connection needs to have .close() called before this method
/// will have any effect.
///
/// Once this method is called subsequent calls to .getConnection()
/// will fail :TODO: test this statement
/////////////////////////////////////////////////////////////////////
ConnectionPool.prototype.closeAllConnections = function(){
	this._pool.close();
};

module.exports = ConnectionPool;
