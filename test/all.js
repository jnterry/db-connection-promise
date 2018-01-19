////////////////////////////////////////////////////////////////////////////
///                    Part of db-connection-promise                     ///
////////////////////////////////////////////////////////////////////////////
/// \file all.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief File which imports and runs all other test scripts, with a
/// variety of different database adaptors
////////////////////////////////////////////////////////////////////////////

"use strict";

let fs                  = require('fs');
let AnyDb               = require('any-db');
let DbConnectionPromise = require('../../db-connection-promise');
let require_nc          = require('require-nocache')(module);
let Q                   = require('q');

/////////////////////////////////////////////////////////////////////
/// \brief Helper function which imports a file containing a test suite
/////////////////////////////////////////////////////////////////////
function importTest(name, path){
	if(path == null){ path = name; }

	describe(name, function(){
		require_nc("./" + path);
	});
}

function createConnection(options, pool_options){
	let connection = null;
	if(pool_options == null){
		connection = AnyDb.createConnection(options);
	} else {
		connection = AnyDb.createPool(options, pool_options);
	}
	return new DbConnectionPromise(connection);
}

/////////////////////////////////////////////////////////////////////
/// \brief Runs all tests on a DB connection which use purely standard
/// SQL syntax and thus should have consistent behaviour for all adaptors
/////////////////////////////////////////////////////////////////////
function runAllStandardDbTests(){
	importTest('query-simple'        );
	importTest('query-bound-params'  );
	importTest('transaction-errors'  );
	importTest('transaction-implicit');
	importTest('transaction-explicit');
}

function testSqliteInMemory(){
	before(() => {
		global.getDbConnection = function(){
			return createConnection({ adapter  : 'sqlite3' });
		};
	});

	runAllStandardDbTests();
}

function testSqliteFile(){
	let db_filename = process.env.DBCP_TEST_SQLITE_FILE_FILENAME;
	if(db_filename === undefined){ db_filename = 'test_db.sqlite3'; }

	function deleteDbFile(){
		if(fs.existsSync(db_filename)){
			fs.unlinkSync(db_filename);
		}
	}

	function connectToSqlite(pool_params){
		return () => createConnection({ adapter         : 'sqlite3',
		                                database        : db_filename,
		                              }, pool_params);
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
	let db_password = process.env.DBCP_TEST_MYSQL_PASSWORD;
	let db_name     = process.env.DBCP_TEST_MYSQL_DATABASE;

	if(db_password === undefined){ db_password = '';          }
	if(db_name     === undefined){ db_name = 'any_db_q_test'; }

	//:TODO: support env vars for host, user, etc? Also change in get-queryable-type.js

	// Recreate the test table before every test to avoid leaking state between tests
	beforeEach((done) => {
		let connection = AnyDb.createConnection({ adapter  : 'mysql',
		                                          host     : 'localhost',
		                                          user     : 'root',
		                                          password : db_password,
		                                        });
		new DbConnectionPromise(connection)
			.query('DROP DATABASE IF EXISTS ' + db_name + ';')
			.query('CREATE DATABASE ' + db_name)
			.query('USE ' + db_name)
			.close()
			.then(() => { done(); })
			.done();
	});

	function connectToMysql(pool_params){
		return () => createConnection({ adapter         : 'mysql',
		                                host            : 'localhost',
		                                user            : 'root',
		                                password        : db_password,
		                                database        : db_name,
		                              }, pool_params);
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
// Describe block for the entire DbConnectionPromise test suite
describe('DbConnectionPromise', () => {
	importTest('get-queryable-type');
	importTest('connect');

	describe('SQLITE3 IN MEMORY', testSqliteInMemory);

	if(process.env.DBCP_TEST_SQLITE_FILE == true){
		describe('SQLITE3 FILE', testSqliteFile);
	}

	if(process.env.DBCP_TEST_MYSQL == true){
		describe('MYSQL', testMysql);
	}
});
