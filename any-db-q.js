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

// Wraps a function which takes a variable number of arguments,
// then a call back of the form (error, result)
function _wrapFuncParamsCallback(dbh, func){
	return function(){
		let args = arguments; // capture arguments to function

		return Q.promise((resolve, reject) => {
			// Call the function with:
			// - dbh as 'this'
			// - spread args as the first n arguments
			// - a callback as the last parameter
			func.call(dbh, ...args, (err, result) => {
				if(err){ reject(err);     }
				else   { resolve(result); }
			});
		});
	};
}

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
}

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

function _promisfyConnection(dbh) {
	let result = {
		_connection : dbh,
		query       : _wrapFuncParamsCallback(dbh, dbh.query),
	};

	result.begin       = _beginPromised     (result);
	result.transaction = _doOpsInTransaction(result);

	result.close = _generateCloseMethod(dbh);

	return result;
}

function connect(connection_options, pool_params){
	let result = {};

	result._any_db = require('any-db');

	return Q.promise((resolve, reject) => {

		if(pool_params === undefined){
			// Then create single connection to the database
			result._any_db.createConnection(connection_options, (error, connection) => {
				if(error){
					reject(error);
				} else {
					resolve(_promisfyConnection(connection));
				}
			});
		} else {
			// Then create connection pool to the database

			if(connection_options.adapter  === 'sqlite3' &&
			   connection_options.host     ==  null      &&
			   connection_options.database ==  null      &&
			   !connection_options.force_sqlite3_pool){

				throw (
					new Error("Attempted to connect to sqlite3 in memory database as a pool.\n" +
					          "Each connection would have its own distinct in memory database, " +
					          "between which no data would be shared.\n" +
					          "This probably isn't what you intended. If it is, set " +
					          "'connection_options.force_sqlite3_pool' to a truthy value.")
				);
			}

			let connection = result._any_db.createPool(connection_options, pool_params);
			resolve(_promisfyConnection(connection, connection_options));
		}
	});
}

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
	let defer = Q.defer();
	begin_tx(this._pool, { autoRollback: false }, (err, tx) => {
		if(err){
			defer.reject(err);
			return;
		}

		let result = (_promisfyConnection(tx));

		result.getPool = (() => { return this; });

		defer.resolve(result);
	});

	return defer.promise;


	/*	return function(){
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
	};*/
};

/////////////////////////////////////////////////////////////////////
/// \brief Closes all active connections, should be called when the application
/// wants to exit
/////////////////////////////////////////////////////////////////////
ConnectionPool.prototype.closeAllConnections = function(){
	this._pool.close();
};

module.exports = ConnectionPool;
