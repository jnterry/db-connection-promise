////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file transaction-wrapper.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains tests for database transactions using explicit
/// begin/commit/rollback interface
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

it('Insert in transaction and commit', () => {
	return initUserTable().then((dbh) => {
		return dbh.begin().then((tx) => {
			return tx.query(`INSERT INTO user (id, username, password) VALUES
			                      (1, 'bob', 'pass');`
			                )
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows        ).to.deep.equal([]);

					return tx.query(`SELECT * FROM user;`);
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

					return tx.commit();
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
		return dbh.begin().then((tx) => {
			return tx.query(`INSERT INTO user (id, username, password) VALUES
			                      (1, 'bob', 'pass');`
			                )
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows        ).to.deep.equal([]);

					return tx.query(`SELECT * FROM user;`)
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

					tx.rollback();
				});
		}).then(() => {
			return dbh.query(`SELECT * FROM user;`);
			// tx was rolled back, so should be no data
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(0);
			expect(results.rows        ).to.deep.equal([]);
		});
	});
});

it('Nested Transactions - Commit All', () => {
	return initUserTableWithUser({ id: 9, username: 'admin', password: 'root'}).then((dbh) => {
		return dbh.begin().then((tx) => {
			return tx.query(`UPDATE user SET username = 'me' WHERE id = 9`)
				.then((results) => {
					return tx.begin().then((tx2) => {
						return tx2.query(`INSERT INTO user (id, username, password) VALUES (5, 'a', 'b')`)
							.then(tx2.commit);
					});
				}).then(tx.commit);
		}).then(() => {
			// By now both transactions should have been committed

			return dbh.query(`SELECT * FROM user ORDER BY id ASC`)
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.lastInsertId).is.not.ok;
					expect(results.rowCount    ).to.deep.equal(2);
					expect(results.rows[0]     ).to.deep.equal({ id: 5, username: 'a',  password: 'b'   });
					expect(results.rows[1]     ).to.deep.equal({ id: 9, username: 'me', password: 'root'});
				});
		});
	});
});

it('Nested Transactions - Inner Rollback', () => {
	return initUserTableWithUser({ id: 9, username: 'admin', password: 'root'}).then((dbh) => {
		return dbh.begin().then((tx) => {
			return tx.query(`UPDATE user SET username = 'me' WHERE id = 9`)
				.then((results) => {
					return tx.begin().then((tx2) => {
						return tx2.query((`INSERT INTO user (id, username, password) VALUES (5, 'a', 'b')`))
							.then(tx2.rollback);
					});
				}).then(tx.commit);
		}).then(() => {
			// By now both transactions should have been committed

			return dbh.query(`SELECT * FROM user ORDER BY id ASC`)
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.lastInsertId).is.not.ok;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows[0]     ).to.deep.equal({ id: 9, username: 'me', password: 'root'});
				});
		});
	});
});

it('Nested Transactions - Outer Rollback', () => {
	return initUserTableWithUser({ id: 9, username: 'admin', password: 'root'}).then((dbh) => {
		return dbh.begin().then((tx) => {
			return tx.query(`UPDATE user SET username = 'me' WHERE id = 9`)
				.then((results) => {
					return tx.begin().then((tx2) => {
						return tx2.query((`INSERT INTO user (id, username, password) VALUES (5, 'a', 'b')`))
							.then(tx2.commit);
					});
				}).then(tx.rollback);
		}).then(() => {
			// By now both transactions should have been committed

			return dbh.query(`SELECT * FROM user ORDER BY id ASC`)
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.lastInsertId).is.not.ok;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows[0]     ).to.deep.equal({ id: 9, username: 'admin', password: 'root'});
				});
		});
	});
});
