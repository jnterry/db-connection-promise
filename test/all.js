////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file all.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief File which imports and runs all other test scripts, with a
/// variety of different database adaptors
////////////////////////////////////////////////////////////////////////////

"use strict";

let fs         = require('fs');
let AnyDbQ     = require('../any-db-q');
let require_nc = require('require-nocache')(module);
let Q          = require('q');

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
	importTest('transaction-explict');
	importTest('transaction-wrapper');
}

function testSqliteInMemory(){
	before(() => {
		global.getDbConnection = function(){
			let dbPool = new AnyDbQ({ adapter  : 'sqlite3' });
			return dbPool.getConnection();
		};
	});

	runAllStandardDbTests();
}

function testSqliteFile(){
	let db_filename = process.env.ANY_DB_Q_TEST_SQLITE_FILE_FILENAME;
	if(db_filename === undefined){ db_filename = 'test_db.sqlite3'; }

	function deleteDbFile(){
		if(fs.existsSync(db_filename)){
			fs.unlinkSync(db_filename);
		}
	}

	function connectToSqlite(pool_params){
		if(pool_params == null){ pool_params = {}; }
		return () => {
			let dbPool = new AnyDbQ({ adapter         : 'sqlite3',
			                          database        : db_filename,
			                          min_connections : pool_params.min,
			                          max_connections : pool_params.max,
			                        });
			return dbPool.getConnection();
		};
	};

	afterEach(deleteDbFile);

	describe('STANDALONE', () => {
		before(() => {
			deleteDbFile();
			global.getDbConnection = connectToSqlite();
		});
		runAllStandardDbTests();
	});

	describe('POOL', () => {
		before(() => {
			deleteDbFile();
			global.getDbConnection = connectToSqlite({ min: 1, max: 10});
		});
		runAllStandardDbTests();
	});
};

function testMysql(){
	let db_password = process.env.ANY_DB_Q_TEST_MYSQL_PASSWORD;
	let db_name     = process.env.ANY_DB_Q_TEST_MYSQL_DATABASE;

	if(db_password === undefined){ db_password = '';          }
	if(db_name     === undefined){ db_name = 'any_db_q_test'; }

	//:TODO: support env vars for host, user, etc?

	// Recreate the test table before every test to avoid leaking state between tests
	beforeEach(() => {
		let dbPool = new AnyDbQ({ adapter  : 'mysql',
		                          host     : 'localhost',
		                          user     : 'root',
		                          password : db_password,
		                        });
		return dbPool.getConnection()
			.then((dbh) => {
				return Q()
					.then(() => { return dbh.query('DROP DATABASE IF EXISTS ' + db_name + ';'); })
					.then(() => { return dbh.query('CREATE DATABASE ' + db_name); })
					.then(() => { return dbh.query('USE ' + db_name); });
			});
	});

	function connectToMysql(pool_params){
		if(pool_params == null){ pool_params = {}; }
		return () => {
			let dbPool = new AnyDbQ({ adapter         : 'mysql',
		                    host            : 'localhost',
		                    user            : 'root',
		                    password        : db_password,
		                    database        : db_name,
		                    min_connections : pool_params.min,
		                    max_connections : pool_params.max,
			                        });
			return dbPool.getConnection();
		};
	}

	describe('STANDALONE', () => {
		before(() => { global.getDbConnection = connectToMysql(); });
		runAllStandardDbTests();
	});

	describe('POOL', () => {
		before(() => { global.getDbConnection = connectToMysql({ min: 1, max: 10}); });
		runAllStandardDbTests();
	});
}

/////////////////////////////////////////////////////////
// Describe block for the entire any-db-q test suite
describe('AnyDbQ', () => {
	importTest('connect');

	describe('SQLITE3 IN MEMORY', testSqliteInMemory);

	if(process.env.ANY_DB_Q_TEST_SQLITE_FILE == true){
		describe('SQLITE3 FILE', testSqliteFile);
	}

	if(process.env.ANY_DB_Q_TEST_MYSQL == true){
		describe('MYSQL', testMysql);
	}
});
