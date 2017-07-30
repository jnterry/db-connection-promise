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

	if(process.env.ANY_DB_Q_TEST_MYSQL == true){
		let db_password = process.env.ANY_DB_Q_TEST_MYSQL_PASSWORD;
		let db_name     = process.env.ANY_DB_Q_TEST_MYSQL_DATABASE;

		if(db_password === undefined){ db_password = '';          }
		if(db_name     === undefined){ db_name = 'any_db_q_test'; }

		//:TODO: support env vars for host, user, etc?

		describe('MYSQL', () => {
			beforeEach(() => {
				return AnyDbQ({ adapter  : 'mysql',
					            host     : 'localhost',
					            user     : 'root',
				                password : db_password,
				              })
					.then((dbh) => {
						return Q()
							.then(() => { return dbh.query('DROP DATABASE IF EXISTS ' + db_name + ';'); })
							.then(() => { return dbh.query('CREATE DATABASE ' + db_name); })
							.then(() => { return dbh.query('USE ' + db_name); });
					});
			});

			describe('STANDALONE', () => {
				before(() => {
					global.getDbConnection = function(){
						return AnyDbQ({ adapter  : 'mysql',
						                host     : 'localhost',
						                user     : 'root',
						                password : db_password,
						                database : db_name,
						              });
					};
				});
				runAllStandardDbTests();
			});

			describe('POOL', () => {
				before(() => {
					global.getDbConnection = function(){
						return AnyDbQ({ adapter  : 'mysql',
						                host     : 'localhost',
						                user     : 'root',
						                password : db_password,
						                database : db_name,
						              },
						              { min : 1, max : 10}
						             );
					};
				});
				runAllStandardDbTests();
			});
		});
	}

	if(process.env.ANY_DB_Q_TEST_POSTGRES == true){
		let db_password = process.env.ANY_DB_Q_TEST_POSTGRES_PASSWORD;
		let db_name     = process.env.ANY_DB_Q_TEST_POSTGRES_DATABASE;

		if(db_password === undefined){ db_password = '';          }
		if(db_name     === undefined){ db_name = 'any_db_q_test'; }

		//:TODO: support env vars for host, user, etc?

		describe('POSTGRES', () => {
			beforeEach(() => {
				return AnyDbQ({ adapter  : 'postgres',
					            host     : 'localhost',
					            user     : 'postgres',
				                password : db_password,
				              })
					.then((dbh) => {
						return Q()
							.then(() => { return dbh.query('DROP DATABASE IF EXISTS ' + db_name + ';'); })
							.then(() => { return dbh.query('CREATE DATABASE ' + db_name); })
							.then(() => { return dbh.query('USE ' + db_name); });
					});
			});

			describe('STANDALONE', () => {
				before(() => {
					global.getDbConnection = function(){
						return AnyDbQ({ adapter  : 'postgres',
						                host     : 'localhost',
						                user     : 'root',
						                password : db_password,
						                database : db_name,
						              });
					};
				});
				runAllStandardDbTests();
			});

			describe('POOL', () => {
				before(() => {
					global.getDbConnection = function(){
						return AnyDbQ({ adapter  : 'postgres',
						                host     : 'localhost',
						                user     : 'root',
						                password : db_password,
						                database : db_name,
						              },
						              { min : 1, max : 10}
						             );
					};
				});
				runAllStandardDbTests();
			});
		});
	}
});
