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

let Q = require('q');

module.exports = {};

function _promisfyConnection(dbh) {

	// Wraps a function which takes a variable number of arguments,
	// then a call back of the form (error, result)
	function wrapFuncParamsCallback(func){
		return function(){
			let args = arguments; // capture arguments to function

			return Q.promise((resolve, reject) => {
				// Calll the function with:
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

	return {
		query : wrapFuncParamsCallback(dbh.query, arguments),

	};
}

function initializeConnection(options){
	///////////////////////////////////////////
	// Generated connection URL
	if(options.protocol === undefined){
		options.protocol = 'postgres';
	}
	if(['postgres', 'mysql', 'sqlite3', 'mssql']
	   .indexOf(options.protocol) === -1){
		throw "Unknown database protocol: " + options.protocol;
	}

	let connection_url = options.protocol + '://';

	if(options.user     === undefined){ throw "Database username not specified"; }
	if(options.password === undefined){ throw "Database password not specified"; }

	connection_url += options.user + ':' + options.password + '@';

	if(options.hostname === undefined){
		options.hostname = 'localhost';
	}

	connection_url += options.hostname;

	if(options.port !== undefined){
		connection_url += ':' + options.port;
	}

	if(options.database === undefined){
		throw "Database name not specified";
	}
	connection_url += '/' + options.database;

	///////////////////////////////////////////
	// Connect to the database
	// :TODO: support pooled connection (based on values in options)

	let result = {};

	result._any_db = require('any-db-' + options.protocol);

	result.getConnection = function(){
		return Q.promise((resolve, reject) => {
			result._any_db.createConnection(connection_url, (error, result) => {
				if(error){
					reject(error);
				} else {
					result._connection = _promisfyConnection(result);
					result.getConnection = function(){
						return result._connection;
					}
					resolve(result._connection);
				}
			});
		});
	}

	result.releaseConnection = function (){
		// no-op
	}

	return result;
}

module.exports = initializeConnection;
