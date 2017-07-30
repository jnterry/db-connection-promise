////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file transaction.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains tests for database transactions
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

it('Insert in transaction and commit', () => {
	return initUserTable().then((dbh) => {
		return dbh.transaction((dbh) => {
			return dbh.query(`INSERT INTO user (id, username, password) VALUES
			                      (1, 'bob', 'pass');`
			                )
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows        ).to.deep.equal([]);

					return dbh.query(`SELECT * FROM user;`)
				}).then((results) => {
					// Check data is visible within the transaction
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
		}).then(() => {
			return dbh.query(`SELECT * FROM user;`);
		}).then((results) => {
			// No error should have occurred within transaction, so
			// results should have been committed and be visible outside
			// the transaction
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
});

it('Insert in transaction and rollback', () => {
	return initUserTable().then((dbh) => {
		return dbh.transaction((dbh) => {
			return dbh.query(`INSERT INTO user (id, username, password) VALUES
			                      (1, 'bob', 'pass');`
			                )
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows        ).to.deep.equal([]);

					return dbh.query(`SELECT * FROM user;`)
				}).then((results) => {

					// Check data is visible within the transaction
					expect(results             ).does.exist;
					expect(results.lastInsertId).is.not.ok;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows        ).is.a('array').with.length(1);
					expect(results.rows[0]     ).to.deep.equal({
						id       : 1,
						username : 'bob',
						password : 'pass',
					});

					throw "A bad thing happened";
				});
		}).then(() => {
			return dbh.query(`SELECT * FROM user;`);
		}).then((results) => {
			// No error should have occurred within transaction, so
			// results should have been commited and be visable outside
			// the transaction
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(0);
			expect(results.rows        ).to.deep.equal([]);
		});
	});
});
