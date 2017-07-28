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

	console.log("Connecting to: " + connection_url);

	///////////////////////////////////////////
	// Connect to the database
	// :TODO: support pooled connection (based on values in options)
	let any_db = require('any-db-' + options.protocol);
	let connection = any_db.createConnection(connection_url);

	return {
		_any_db       : any_db,
		_connection   : _promisfyConnection(connection),

		getConnection : function(){
			return Q(this._connection);
		},

		releaseConnection : function(){
			// no-op
		}
	};
}

module.exports = initializeConnection;
