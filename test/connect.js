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

function isValidConnection(connection){
	expect(connection).to.exist;
	expect(connection.query).to.be.a('function');
	return connection;
}

it('Single connection returns valid connection', () => {
	return AnyDbQ({
		'adapter'  : 'sqlite3',
	}).then(isValidConnection);
});

it("Can't connect to sqlite3 in memory database as pool without flag", (done) => {
	expectPromiseFails(done,
	                   AnyDbQ({ 'adapter' : 'sqlite3', },
	                          { min : 2, max : 32 }
	                         )
	                  );
});

it("Connect to sqlite3 in memory database as pool with flag returns valid connection",
   () => {
	   return AnyDbQ({ 'adapter' : 'sqlite3', force_sqlite3_pool: 1},
	                 { min : 2, max : 32 }
	                ).then(isValidConnection);
   }
  );

it("Connect to sqlite3 file database as pool without flag returns valid connection",
   () => {
	   return AnyDbQ({ 'adapter' : 'sqlite3', database : 'test_db.sqlite3'},
	                 { min : 2, max : 32 }
	                ).then(isValidConnection);
   }
);

it('Invalid adapter value returns invalid connection', (done) => {
	expectPromiseFails(done, AnyDbQ({'adapter' : 'fake'}));
});

it('Bad credentials return invalid connection', (done) => {
	expectPromiseFails(done, AnyDbQ({
		'adapter'   : 'mysql',
		'host'      : 'localhost',
		'user'      : 'X_BAD_USER_X',
		'password'  : '_A_PASSWORD_'
	}));
});

it('Bad port return invalid connection', (done) => {
	expectPromiseFails(done, AnyDbQ({
		'adapter'   : 'mysql',
		'host'      : 'localhost',
		'user'      : 'X_BAD_USER_X',
		'password'  : '_A_PASSWORD_',
		'port'      : '-1'
	}));
});
