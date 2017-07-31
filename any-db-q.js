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

function _promisfyConnection(dbh, connection_options) {
	let result = {
		_connection : dbh,
		query       : _wrapFuncParamsCallback(dbh, dbh.query),
		getAdapter  : () => { return connection_options.adapter; },
	};

	result.begin       = _beginPromised     (result, connection_options);
	result.transaction = _doOpsInTransaction(result, connection_options);

	if(dbh.close === undefined){
		result.close = function(){}; // no-op
	} else {
		result.close = function(){
			// cant just do = dbh.close since 'this.' inside
			// function would not be set correctly
			dbh.close();
		};
	}

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
