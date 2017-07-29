////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file query-simple.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Tests for running simple queries against the database
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

var expect = require('chai').expect;
var AnyDbQ = require('../any-db-q');

it('Create table and query', () => {
	return AnyDbQ({
		'adapter'  : 'sqlite3',
	}).then((dbh) => {
		return dbh.query(
			`CREATE TABLE user (
				id       int          NOT NULL PRIMARY KEY,
				username varchar(255),
				password varchar(255)
			);`
		).then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).to.deep.equal(undefined);
			expect(results.rowCount    ).to.deep.equal(0);
			expect(results.rows        ).to.deep.equal([]);

			return dbh.query(`INSERT INTO user (id, username, password) VALUES
			                      (1, 'bob', 'pass');`
			                );
		}).then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).to.deep.equal(1);
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows        ).to.deep.equal([]);

			return dbh.query(`SELECT * FROM user;`)
		}).then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).to.deep.equal(undefined);
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows        ).is.a('array').with.length(1);
			expect(results.rows[0]     ).to.deep.equal({
				id       : 1,
				username : 'bob',
				password : 'pass',
			});
		});
	});
});

it('Empty SQL query produces error', (done) => {
	expectPromiseFails(done,
		AnyDbQ({
			'adapter'  : 'sqlite3',
		}).then((dbh) => {
			return dbh.query('');
		})
	);
});

it('Bad SQL syntax produces error', (done) => {
	expectPromiseFails(done,
		AnyDbQ({
			'adapter'  : 'sqlite3',
		}).then((dbh) => {
			return dbh.query(`a`);
		})
	);
});

it('Querying non-existent table produces error', (done) => {
	expectPromiseFails(done,
		AnyDbQ({
			'adapter'  : 'sqlite3',
		}).then((dbh) => {
			return dbh.query(`SELECT * from user;`);
		})
	);
});
