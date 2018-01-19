////////////////////////////////////////////////////////////////////////////
///                    Part of db-connection-promise                     ///
////////////////////////////////////////////////////////////////////////////
/// \file transaction-wrapper.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains tests for database transactions using implicit commits
/// and rollbacks
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

it('Insert in transaction and commit', () => {
	return initUserTable()
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
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
		})
		.query(`SELECT * FROM user;`)
		.then((results) => {
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

it('Insert in transaction and rollback', () => {
	return initUserTable()
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
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
		})
		.fail((err) => {})
		.query(`SELECT * FROM user;`)
		.then((results) => {
			// Error occurred within the transaction, so it should have been
			// rolled back, and results will not be visible
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(0);
			expect(results.rows        ).to.deep.equal([]);
		});
});

it('Nested Transactions - Commit All', () => {
	return initUserTableWithUser({ id: 9, username: 'admin', password: 'root'})
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
				.query(`UPDATE user SET username = 'me' WHERE id = 9`)
				.transaction((dbh) => {
					isValidTransaction(dbh);
					return dbh.query((`INSERT INTO user (id, username, password) VALUES (5, 'a', 'b')`));
				});
		}) // By now both transactions should have been committed
		.fail((err) => {})
		.query(`SELECT * FROM user ORDER BY id ASC`)
		.then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(2);
			expect(results.rows[0]     ).to.deep.equal({ id: 5, username: 'a',  password: 'b'   });
			expect(results.rows[1]     ).to.deep.equal({ id: 9, username: 'me', password: 'root'});
		});
});

it('Nested Transactions - Inner Rollback', () => {
	return initUserTableWithUser({ id: 9, username: 'admin', password: 'root'})
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
				.query(`UPDATE user SET username = 'me' WHERE id = 9`)
				.transaction((dbh) => {
					isValidTransaction(dbh);
					return dbh
						.query((`INSERT INTO user (id, username, password) VALUES (5, 'a', 'b')`))
						.then(() => { throw "A nasty error :o"; });
				}).fail((err) => {})
		})
		.fail((err) => {})
		.query(`SELECT * FROM user ORDER BY id ASC`)
		.then((results) => {
			// By now inner transaction should have been rolled back, but outer committed
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows[0]     ).to.deep.equal({ id: 9, username: 'me', password: 'root'});
		});
});

it('Nested Transactions - Outer Rollback', () => {
	return initUserTableWithUser({ id: 9, username: 'admin', password: 'root'})
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
				.query(`UPDATE user SET username = 'me' WHERE id = 9`)
				.transaction((dbh) => {
					isValidTransaction(dbh);
					return dbh.query((`INSERT INTO user (id, username, password) VALUES (5, 'a', 'b')`));
				})
				.then(() => { throw "A nasty error :o"; });
		})
		.fail((err) => {})
		.query(`SELECT * FROM user ORDER BY id ASC`)
		.then((results) => {
			// By now the outer transaction should have been rolled back, which will
			// implicitly roll back the inner transaction
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows[0]     ).to.deep.equal({ id: 9, username: 'admin', password: 'root'});
		});
});

it('Nested Transactions - Both Rollback', () => {
	return initUserTableWithUser({ id: 9, username: 'admin', password: 'root'})
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
				.query(`UPDATE user SET username = 'me' WHERE id = 9`)
				.transaction((dbh) => {
					isValidTransaction(dbh);
					return dbh
						.query((`INSERT INTO user (id, username, password) VALUES (5, 'a', 'b')`))
						.then(() => { throw "A nasty error :o"; });
				})
				.then(() => { throw "An even nastier error :o"; });
		})
		.fail((err) => {})
		.query(`SELECT * FROM user ORDER BY id ASC`)
		.then((results) => {
			// By now both transactions should have been rolled back
			expect(results             ).does.exist;
			expect(results.lastInsertId).is.not.ok;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows[0]     ).to.deep.equal({ id: 9, username: 'admin', password: 'root'});
		});
});

it('Can pass data out of committed transaction', () => {
	return initUserTableWithUser({ id: 100, username : 'johnsmith', password: 'abc'})
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
				.query(`UPDATE user SET username = 'j.smith' WHERE id = 100`)
				.then((results) => {
					expect(results).does.exist;
				})
				.query(`SELECT * from user`)
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows[0]     ).to.deep.equal({ id: 100, username: 'j.smith', password: 'abc'});
					return results;
				});
		})
		.then((results) => {
			expect(results             ).does.exist;
			expect(results.rowCount    ).to.deep.equal(1);
			expect(results.rows[0]     ).to.deep.equal({ id: 100, username: 'j.smith', password: 'abc'});
		});
});

it('Can\'t pass data out of rolledback transaction', () => {
	return initUserTableWithUser({ id: 100, username : 'johnsmith', password: 'abc'})
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
				.query(`UPDATE user SET username = 'j.smith' WHERE id = 100`)
				.then((results) => {
					expect(results).does.exist;
				})
				.query(`SELECT * from user`)
				.then((results) => {
					expect(results             ).does.exist;
					expect(results.rowCount    ).to.deep.equal(1);
					expect(results.rows[0]     ).to.deep.equal({ id: 100, username: 'j.smith', password: 'abc'});
					throw "Error";
				});
		})
		.fail(() => {})
		.then((results) => {
			expect(results).does.not.exist;
		});
});
