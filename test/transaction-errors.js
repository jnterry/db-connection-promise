////////////////////////////////////////////////////////////////////////////
///                    Part of db-connection-promise                     ///
////////////////////////////////////////////////////////////////////////////
/// \file transaction-errors.js
/// \author Jamie Terry
/// \date 2018/01/19
/// \brief Contains tests for errors propagating out of transactions
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

function checkErrorEscapes(done, expected_error, dbh){
	return dbh
		.then(
			(val) => {
				expect(val).does.not.exist;
				done(new Error("Error did not escape transaction"));
			},
			(err) => {
				if(typeof err === "string"){
					expect(err).deep.equal(expected_error);
				} else {
					expect(err).to.exist;
					expect(err).is.instanceOf(Error);
					expect(err.message).to.exist;
					expect(err.message).to.contain(expected_error);
				}
				if(typeof expected_error == "String"){
				} else
				done();
			}
		)
		.done();
}

it('Exceptions propagate from transaction callback', (done) => {
	checkErrorEscapes(done, "Bad stuff",
		getDbConnection()
			.transaction((dbh) => {
				isValidTransaction(dbh);
				throw "Bad stuff";
			})
	);
});

it('Exceptions propagate from implicit rollback', (done) => {
	checkErrorEscapes(done, "Bad stuff",
		getDbConnection()
			.transaction((dbh) => {
				isValidTransaction(dbh);
				return dbh
					.query('SELECT 1')
					.then((val) => {
						expect(val.rows.length).deep.equal(1);
						expect(val.rows[0]    ).deep.equal({ '1' : 1 });
						throw "Bad stuff";
					})
					.then(() => {
						done(new Error("Execution should not reach here - query should have failed"));
					});
			})
	);
});

it('No exception raised by explicit rollback', (done) => {
	getDbConnection()
		.transaction((dbh) => {
			isValidTransaction(dbh);
			return dbh
				.query('SELECT 1')
				.then((val) => {
					expect(val.rows.length).deep.equal(1);
					expect(val.rows[0]    ).deep.equal({ '1' : 1 });
					return val;
				})
				.rollback();
		})
		.then((val) => {
			expect(val).does.not.exist;
			done();
		})
		.fail(() => {
			done(new Error("Transaction failed"));
		})
		.done();
});

it('Exceptions propagate from bad query', (done) => {
	checkErrorEscapes(done, "non_existent_table",
		getDbConnection()
			.transaction((dbh) => {
				isValidTransaction(dbh);
				return dbh
					.query('SELECT * from non_existent_table')
					.then(() => {
						done(new Error("Execution should not reach here - query should have failed"));
					});
			})
	);
});

it('Exceptions propagate from bad query even if explicitly rolled back', (done) => {
	checkErrorEscapes(done, "non_existent_table",
		getDbConnection()
			.transaction((dbh) => {
				isValidTransaction(dbh);
				return dbh
					.query('SELECT * from non_existent_table')
					.then(() => {
						done(new Error("Execution should not reach here - query should have failed"));
					})
					.rollback();
			})
	);
});
