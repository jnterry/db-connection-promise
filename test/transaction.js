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

it('Single query in transaction', () => {
	return initUserTable().then((dbh) => {
		dbh.begin()
			.then((tx) => {
				return tx.query(`INSERT INTO user (id, username, password) VALUES
				                     (100, 'John', 'cats');`)
					.then((results) => {
						// Verify insert results
						expect(results         ).does.exist;
						expect(results.rowCount).to.deep.equal(1);
						expect(results.rows    ).to.deep.equal([]);

						return tx.commit(); // keep the changes
					});
			})
			.then(() => {
				// Verify the results are visible outside the transaction
				return dbh.query(`SELECT * FROM user`)
					.then((results) => {
						expect(results             ).does.exist;
						expect(results.lastInsertId).is.not.ok;
						expect(results.rowCount    ).to.deep.equal(1);
						expect(results.rows        ).to.be('array').with.length(1);
						expect(results.rows[0]     ).to.deep.equal({
							id       : 100,
							username : 'John',
							password : 'cats',
						});
					});
			})
			.then(() => {
				return dbh.close();
			});
	});
});
