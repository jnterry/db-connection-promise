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

function testSuccessfulConnect(options){
	let dbPool = new AnyDbQ(options);
	let dbh = dbPool.getConnection();
	isValidConnection(dbh);
	dbh.close();
}

it('Single connection returns valid connection', () => {
	testSuccessfulConnect({ 'adapter'  : 'sqlite3' });
});

function deferredMakeAnyDbQPool(options){
	return () => {
		return new AnyDbQ(options);
	};
}

it("Can't connect to sqlite3 in memory database as pool without flag", () => {
	expect(deferredMakeAnyDbQPool({
		adapter       : 'sqlite3',
		min_connections : 2,
		max_connections : 32,
	})).to.throw(Error);
});

it("Connect to sqlite3 in memory database as pool with flag returns valid connection",
   () => {
	   testSuccessfulConnect({ adapter            : 'sqlite3',
	                             force_sqlite3_pool : 1,
	                             min_connections    : 2,
	                             max_connections    : 32,
	                         });
   }
  );

it("Connect to sqlite3 file database as pool without flag returns valid connection",
   () => {
	   testSuccessfulConnect({ adapter         : 'sqlite3',
	                           database        : 'test_db.sqlite3',
	                           min_connections : 2,
	                           max_connections : 32,
	                         });
   }
);

it('Invalid adapter value returns invalid connection', () => {
	expect(deferredMakeAnyDbQPool({
		adapter         : 'fake',
	})).to.throw(Error);
});

it('Bad credentials return invalid connection', (done) => {
	let dbPool = new AnyDbQ({
		adapter   : 'mysql',
		host      : 'localhost',
		user      : 'X_BAD_USER_X',
		password  : '_A_PASSWORD_'
	});
	expectPromiseFails(done, dbPool.getConnection());
});

it('Bad port return invalid connection', (done) => {
	let dbPool = new AnyDbQ({
		'adapter'   : 'mysql',
		'host'      : 'localhost',
		'user'      : 'X_BAD_USER_X',
		'password'  : '_A_PASSWORD_',
		'port'      : '-1'
	});
	expectPromiseFails(done, dbPool.getConnection());
});
