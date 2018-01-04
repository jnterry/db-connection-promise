////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file 01-connect.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains tests for getting a connection to the database
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

let AnyDbQ = require('../any-db-q');
let AnyDb  = require('any-db');

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
	let dbh = new AnyDbQ(connection);
	isValidConnection(dbh);
	dbh.close();
}

it('Sqlite3 Single connection', () => {
	testSuccessfulConnect({ 'adapter'  : 'sqlite3' });
});

function deferredMakeAnyDbQPool(options){
	return () => {
		return new AnyDbQ(options);
	};
}

it('Sqlite3 Pool Connection',
   () => {
	   testSuccessfulConnect({ adapter         : 'sqlite3',
	                           database        : 'test_db.sqlite3',
	                         }, {min : 2, max: 32}
	                        );
   }
);

it('Invalid adapter value returns invalid connection', () => {
	expect(deferredMakeAnyDbQPool({
		adapter         : 'fake',
	})).to.throw(Error);
});

/*it('Bad credentials return invalid connection', (done) => {
	let connection = AnyDb.createConnection({
		adapter   : 'mysql',
		host      : 'localhost',
		user      : 'X_BAD_USER_X',
		password  : '_A_PASSWORD_'
	});
	expectPromiseFails(done, new AnyDbQ(connection));
});

it('Bad port return invalid connection', (done) => {
	let connection = AnyDb.createConnection({
		'adapter'   : 'mysql',
		'host'      : 'localhost',
		'user'      : 'X_BAD_USER_X',
		'password'  : '_A_PASSWORD_',
		'port'      : '-1'
	});
	expectPromiseFails(done, new AnyDbQ(connection));
});*/
