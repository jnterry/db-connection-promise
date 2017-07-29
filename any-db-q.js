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
		close : function(){}
	};
}

function connect(connection_options, pool_params){
	let result = {};

	result._any_db = require('any-db');


	return Q.promise((resolve, reject) => {
		function createCallback(error, connection){
			if(error){
				reject(error);
			} else {
				resolve(_promisfyConnection(connection));
			}
		}

		if(pool_params === undefined){
			result._any_db.createConnection(connection_options, createCallback);
		} else {
			result._any_db.createPool(connection_options, pool_params, createCallback);
		}
	});
}

module.exports = connect;
