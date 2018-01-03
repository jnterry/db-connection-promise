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

function ConnectionPromise(queryable){
	let defer = Q.defer();

	this._connection = null;
	this._promise    = defer.promise;

	if(typeof queryable.acquire === 'function' &&
	   typeof queryable.release === 'function'){
		// Then its a pool of connections, grab one
		queryable.acquire((err, conn) => {
			if(err){
				defer.reject(err);
				return;
			}

			this._connection = conn;
			defer.resolve(conn);
		});

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
				queryable.release(this._connection);
				this._connection = null;
			});
			return this;
		};
	} else if (typeof queryable.commit   === 'function' &&
	           typeof queryable.rollback === 'function'){
		// Then its a transaction
		this._connection = queryable;

		let wrapper = (func_name) => {
			return () => {
				this._promise = this._promise.then(() => {
					let defer = Q.defer();
					queryable[func_name]((err) => {
						if(err){
							defer.reject(err);
						} else {
							defer.resolve(true);
						}
					});
					return defer.promise;
				});
				return this;
			};
		};

		this.commit   = wrapper('commit'  );
		this.rollback = wrapper('rollback');

		defer.resolve(queryable);
	} else {
		defer.reject(new Error("Unknown queryable type, cannot create ConnectionPromise"));
	}
};

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
	if(typeof this.close === 'function'){
		this.close();
	}
	// :TODO: should we auto commit/rollback a transaction?
	//        -> if so need to keep track of if committed/rolledback, since can't
	//           do it twice
	this._promise = this._promise
		.done(onFulfilled, onRejected, onProgress);

	return this;
};

ConnectionPromise.prototype.transaction = function(operations){
	this._promise = this._promise.then(() => {
		let defer = Q.defer();

		begin_tx(this._connection, { autoRollback: false }, (err, tx) => {
			if(err){
				defer.reject(err);
				return;
			}

			let dbh_tx = new ConnectionPromise(tx);

			let doAction = (func_name) => {
				tx[func_name]((err) => {
					if(err){ defer.reject(err);   }
					else   { defer.resolve(true); }
				});
			};

			let manually_closed = false;
			tx.on('close', () => { manually_closed = true; });
			let operation = '';
			operations(dbh_tx)
				.then(() => { operation = 'commit';   },
				      () => { operation = 'rollback'; }
				     )
				.then(() => {
					if(!manually_closed){
						doAction(operation);
					} else {
						defer.resolve(true);
					}
				})
				.done();
		});

		return defer.promise;
	});
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

// Ensure users of the library can get access to the underlying ConnectionPromise
// This means you can create the connection/connection pool using standard
// any-db functions, and then just wrap then in a new ConnectionPromise
ConnectionPool.ConnectionPromise = ConnectionPromise;

module.exports = ConnectionPool;
