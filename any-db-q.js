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
function _beginPromised(dbh, connection_options){
	return function(){
		let defer = Q.defer();
		begin_tx(dbh._connection, { autoRollback: false }, (err, tx) => {
			if(err){ defer.reject(err); return; }

			let result = (_promisfyConnection(tx, connection_options));

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

function generateCloseMethod(dbh){
	if(dbh._connection !== undefined){
		//then this is a transaction, close the connection behind it
		return generateCloseMethod(dbh._connection);
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

function _promisfyConnection(dbh, connection_options) {
	let result = {
		_connection : dbh,
		query       : _wrapFuncParamsCallback(dbh, dbh.query),
		getAdapter  : () => { return connection_options.adapter; },
	};

	result.begin       = _beginPromised     (result, connection_options);
	result.transaction = _doOpsInTransaction(result, connection_options);

	result.close = generateCloseMethod(dbh);

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
					resolve(_promisfyConnection(connection, connection_options));
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

module.exports = connect;
