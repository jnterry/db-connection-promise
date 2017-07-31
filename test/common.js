////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file common.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains common code for running tests
////////////////////////////////////////////////////////////////////////////

global.expect = require('chai').expect;

let AnyDbQ = require('../any-db-q');

////////////////////////////////////////////////////////////////////////////
// Test suite files obtain a database connection using getDbConnection,
// if it hasn't been set by someone else provide a simple default
// (in memory sqlite3 non-pooled connection)
// This allows the test suite files to be ran independently and still
// get a DB connection, but also for them to be ran as a part of all.js
// which sets getDbConnection to test more complex configurations
if(global.getDbConnecion === undefined){
	global.getDbConnection = function(){
		return AnyDbQ({ adapter: 'sqlite3'});
	};
}

/////////////////////////////////////////////////////////////////////
/// \brief Helper function which defines a test which only passes if
/// a promise is rejected
/// \param done    The `done` callback provided by it()
/// \param promise The promise which should be rejected
/////////////////////////////////////////////////////////////////////
global.expectPromiseFails = function(done, promise){
	return promise.then((results) => {
		done(new Error("Execution shouldn't reach here; expected failure", results));
	}).fail((error) => {
		done();
	});
};

/////////////////////////////////////////////////////////////////////
/// \brief Helper function which sets up an empty 'users' table
/////////////////////////////////////////////////////////////////////
global.initUserTable = function(){
	return getDbConnection().then((dbh) => {
		let autoincrement_word = '';
		switch(dbh.getAdapter()){
		case 'mysql':
			autoincrement_word = 'AUTO_INCREMENT';
			break;
		case 'sqlite3':
			break;
		}
		return dbh.query(
			`CREATE TABLE user (
				id       INTEGER      PRIMARY KEY ` + autoincrement_word + ',' +
			`   username varchar(255) NOT NULL,
				password varchar(255) NOT NULL
			);`
		).then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(0);
			expect(results.rows        ).to.deep.equal([]);

			return dbh; // make dbh accessible to calling code
		});
	});
};

global.initUserTableWithUser = function(user){
	if(user === undefined){
		user = { id: 1, username : 'Bob', password: 'password' };
	}

	return initUserTable()
		.then((dbh) => {
			return dbh.query(`INSERT INTO user VALUES (?,?,?)`,
			                 [user.id, user.username, user.password])
				.then((results) => {
					expect(results         ).does.exist;
					expect(results.rowCount).is.deep.equal(1);
					expect(results.rows    ).is.deep.equal([]);

					return dbh.query('SELECT * FROM user');
				})
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.lastInsertId).is.not.ok;
					expect(results.rowCount    ).is.deep.equal(1);
					expect(results.rows[0]     ).is.deep.equal(user);

					return dbh; // make dbh accessible to calling code
				});
		});

};
