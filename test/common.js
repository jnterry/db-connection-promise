////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file common.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains common code for running tests
////////////////////////////////////////////////////////////////////////////


global.expect = require('chai').expect;
global.AnyDbQ = require('../any-db-q');

global.expectPromiseFails = function(done, promise){
	return promise.then((results) => {
		done(new Error("Execution shouldn't reach here; expected failure", results));
	}).fail((error) => {
		done();
	});
};

global.initUserTable = function(){
	return AnyDbQ({
		'adapter'  : 'sqlite3',
	})
	.then((dbh) => {
		return dbh.query(
			`CREATE TABLE user (
				id       int          NOT NULL PRIMARY KEY,
				username varchar(255) NOT NULL,
				password varchar(255) NOT NULL
			);`
		).then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).to.deep.equal(undefined);
			expect(results.rowCount    ).to.deep.equal(0);
			expect(results.rows        ).to.deep.equal([]);

			return dbh; // make dbh accessible to calling code
		});
	});
}
