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

it('Init User Table functions correctly', () => {
	return initUserTable()
		.query('SELECT count(id) as count FROM user')
		.then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows        ).is.a('array').with.length(1);
			expect(results.rows[0]     ).to.deep.equal({
				count : 0,
			});
		});
});

it('Create table and query', () => {
	return initUserTable()
		.query(`INSERT INTO user (id, username, password) VALUES
			                       (1, 'bob', 'pass');`
		      )
		.then((results) => {
			expect(results             ).does.exist;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows        ).to.deep.equal([]);
		})
		.query(`SELECT * FROM user;`)
		.then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows        ).is.a('array').with.length(1);
			expect(results.rows[0]     ).to.deep.equal({
				id       : 1,
				username : 'bob',
				password : 'pass',
			});
		});
});

it('Create table and query relying on AUTO_INCREMENT', () => {
	return initUserTable()
		.query(`INSERT INTO user (username, password) VALUES
			                       ('bob', 'pass');`
		      )
		.then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).to.deep.equal(1);
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows        ).to.deep.equal([]);
		})
		.query(`SELECT * FROM user;`)
		.then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows        ).is.a('array').with.length(1);
			expect(results.rows[0]     ).to.deep.equal({
				id       : 1,
				username : 'bob',
				password : 'pass',
			});
		});
});

it('Empty SQL query produces error', (done) => {
	expectPromiseFails(done, getDbConnection().query(''));
});

it('Bad SQL syntax produces error', (done) => {
	expectPromiseFails(done, getDbConnection().query(`a`));
});

it('Querying non-existent table produces error', (done) => {
	expectPromiseFails(done, getDbConnection().query(`SELECT * from user;`));
});

it('Connection can be closed', (done) => {
	getDbConnection()
		.query('SELECT 1')
		.then((results) => {
			expect(results.rows).to.deep.equals([{ '1' : 1} ]);
		})
		.close()
		.fail((err) => { done(err); } )
		.query('SELECT 1')
		.then((val) => {
			done(new Error("Query should not have completed after connection is closed, got: " +
			               JSON.stringify(val)
			              )
			    );
		})
		.fail((err) => {
			// then success, we expect the query after the close to fail
			done();
		})
		.done();
});
