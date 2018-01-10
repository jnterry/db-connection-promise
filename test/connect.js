////////////////////////////////////////////////////////////////////////////
///                    Part of db-connection-promise                     ///
////////////////////////////////////////////////////////////////////////////
/// \file 01-connect.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains tests for getting a connection to the database
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

let DbConnectionPromise = require('../db-connection-promise');
let AnyDb               = require('any-db');

function isValidConnection(connection){
	expect(connection).to.exist;
	expect(connection.query).to.be.a('function');
	expect(connection.close).to.be.a('function');
	return connection;
}

function testSuccessfulConnect(options, pool_options){
	let connection = null;
	if(pool_options == null){
		connection = AnyDb.createConnection(options);
	} else {
		connection = AnyDb.createPool(options, pool_options);
	}
	return DbConnectionPromise(connection, (dbh) => {
		isValidConnection(dbh);
		return dbh.close();
	});
}

it('Sqlite3 Single connection', () => {
	return testSuccessfulConnect({ 'adapter'  : 'sqlite3' });
});

it('Sqlite3 Pool Connection',
   () => {
	   return testSuccessfulConnect({ adapter         : 'sqlite3',
	                                  database        : 'test_db.sqlite3',
	                                }, {min : 2, max: 32}
	                               );
   }
);

/*it('Bad credentials return invalid connection', (done) => {
	let connection = AnyDb.createConnection({
		adapter   : 'mysql',
		host      : 'localhost',
		user      : 'X_BAD_USER_X',
		password  : '_A_PASSWORD_'
	});
	expectPromiseFails(done, new DbConnectionPromise(connection));
});

it('Bad port return invalid connection', (done) => {
	let connection = AnyDb.createConnection({
		'adapter'   : 'mysql',
		'host'      : 'localhost',
		'user'      : 'X_BAD_USER_X',
		'password'  : '_A_PASSWORD_',
		'port'      : '-1'
	});
	expectPromiseFails(done, new DbConnectionPromise(connection));
});*/
