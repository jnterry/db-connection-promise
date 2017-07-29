////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file 02-simple-query.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Tests for running simple queries against the database
////////////////////////////////////////////////////////////////////////////

"use strict";

let fs         = require('fs');
let AnyDbQ     = require('../any-db-q');
let require_nc = require('require-nocache')(module);

/////////////////////////////////////////////////////////////////////
/// \brief Helper function which imports a file containing a test suite
/////////////////////////////////////////////////////////////////////
function importTest(name, path){
	if(path == null){ path = name; }

	describe(name, function(){
		require_nc("./" + path);
	});
}

/////////////////////////////////////////////////////////////////////
/// \brief Runs all tests on a DB connection which use purely standard
/// SQL syntax and thus should have consistent behaviour for all adaptors
/////////////////////////////////////////////////////////////////////
function runAllStandardDbTests(){
	importTest('query-simple');
	importTest('query-bound-params');
}

describe('AnyDbQ', () => {

	importTest('connect');

	describe('SQLITE3 IN MEMORY', () => {
		before(() => {
			global.getDbConnection = function(){
				return AnyDbQ({ adapter  : 'sqlite3' });
			};
		});

		runAllStandardDbTests();
	});

	describe('SQLITE3 FILE', () => {
		const DB_FILENAME = 'test_db.sqlite3';

		let deleteDbFile = () => {
			if(fs.existsSync(DB_FILENAME)){
				fs.unlinkSync(DB_FILENAME);
			}
		};

		afterEach(deleteDbFile);

		describe('STANDALONE', () => {
			before(() => {
				deleteDbFile();
				global.getDbConnection = () => {
					return AnyDbQ({ adapter  : 'sqlite3',
					                database : DB_FILENAME,
					              });
				};
			});
			runAllStandardDbTests();
		});

		describe('POOL', () => {
			before(() => {
				deleteDbFile();
				deleteDbFile();
				global.getDbConnection = () => {
					return AnyDbQ({ adapter  : 'sqlite3',
					                database : DB_FILENAME,
					              },
					              { min : 1, max : 10 });
				};
			});
			runAllStandardDbTests();
		});
	});
});
