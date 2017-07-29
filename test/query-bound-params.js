////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file query-bound-params.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Tests for running queries with bound parameters against the database
////////////////////////////////////////////////////////////////////////////

"use strict";

require('./common.js');

it('Create table and query', () => {
	return initUserTable().then((dbh) => {
		return dbh.query(`INSERT INTO user (id, username, password) VALUES (?,?,?)`,
		                 [1,'Mr User', 'letmein']
		                )

			.then((results) => {
				expect(results             ).does.exist;
				expect(results.lastInsertId).to.deep.equal(1);
				expect(results.rowCount    ).to.deep.equal(1);
				expect(results.rows        ).to.deep.equal([]);

				return dbh.query(`SELECT username, password FROM user;`)
			}).then((results) => {
				expect(results             ).does.exist;
				expect(results.lastInsertId).is.not.ok;
				expect(results.rowCount    ).to.deep.equal(1);
				expect(results.rows        ).is.a('array').with.length(1);
				expect(results.rows[0]     ).to.deep.equal({
					username : 'Mr User',
					password : 'letmein',
				});
			});
	});
});

it('Create table, insert many, and query', () => {
	return initUserTable().then((dbh) => {
		return dbh.query(`INSERT INTO user (id, username, password) VALUES (?,?,?), (?,?,?)`,
		                 [1,'Mr User', 'letmein',
						  2,'Tim'    , 'password'
						 ]
		                )

			.then((results) => {
				expect(results             ).does.exist;
				expect(results.rowCount    ).to.deep.equal(2);
				expect(results.rows        ).to.deep.equal([]);

				return dbh.query(`SELECT username, password FROM user WHERE id = ?;`, [2])
			}).then((results) => {
				expect(results             ).does.exist;
				expect(results.lastInsertId).is.not.ok;
				expect(results.rowCount    ).to.deep.equal(1);
				expect(results.rows        ).is.a('array').with.length(1);
				expect(results.rows[0]     ).to.deep.equal({
					username : 'Tim',
					password : 'password',
				});
			});
	});
});

/*
:TODO: this works with mysql driver, but using ?  as placeholder for many
args is not supported by sqlite3 (get a syntax error parsing the sql)
 - can we test mysql stuff? -> need to guarentee test env has the database
   and it is empty
 - Why does it fail with sqlite3? probably limitation of the database itself
   rather than anything we can fix :(
it('Can pass array of parameters as placeholder for a group of many', () => {
	return  AnyDbQ({
		'adapter'  : 'mysql',
		'host'     : 'localhost',
		'user'     : 'root',
		'password' : 'test123',
		'database' : 'test',
	}).then((dbh) => {
		return dbh.query(
			`CREATE TABLE user (
				id       int          NOT NULL AUTO_INCREMENT PRIMARY KEY,
				username varchar(255) NOT NULL,
				password varchar(255) NOT NULL
			);`
		).then((results) => {
			expect(results             ).does.exist;
			//expect(results.lastInsertId).to.equal(null);
			expect(results.rowCount    ).to.deep.equal(0);
			expect(results.rows        ).to.deep.equal([]);

			return dbh.query(`INSERT INTO user (username, password) VALUES ?`,
							 [[['Sarah', 'pass123'], ['thing', 'mr thing']]]
							);
		}).then((results) => {
			expect(results             ).does.exist;
			//expect(results.lastInsertId).to.deep.equal(2);
			expect(results.rowCount    ).to.deep.equal(2);
			expect(results.rows        ).to.deep.equal([]);

			return dbh.query(`SELECT id, username, password FROM user;`)
		}).then((results) => {
			expect(results             ).does.exist;
			expect(results.lastInsertId).to.equal(null);
			expect(results.rowCount    ).to.deep.equal(2);
			expect(results.rows        ).is.a('array').with.length(2);
			expect(results.rows[0]     ).to.deep.equal({
				id       : 1,
				username : 'Sarah',
				password : 'pass123',
			});
			expect(results.rows[1]     ).to.deep.equal({
				id       : 2,
				username : 'thing',
				password : 'mr thing',
			});
		});
	});
});
*/

it('Can pass empty array as bound parameters when none are expected', () => {
	return initUserTable().then((dbh) => {
		return dbh.query(`INSERT INTO user (id, username, password)
		                      VALUES (1,'a','b')`, []
						)
			.then((results) => {
				expect(results             ).does.exist;
				expect(results.rowCount    ).to.deep.equal(1);
				expect(results.rows        ).to.deep.equal([]);

				return dbh.query(`SELECT id, password FROM user;`)
			}).then((results) => {
				expect(results             ).does.exist;
				expect(results.lastInsertId).is.not.ok;
				expect(results.rowCount    ).to.deep.equal(1);
				expect(results.rows        ).is.a('array').with.length(1);
				expect(results.rows[0]     ).to.deep.equal({
					id       :   1,
					password : 'b',
				});
			});
	});
});

it('Providing no bound parameters produces error when they are expected',
   (done) => {
	   expectPromiseFails(done, initUserTable().then((dbh) => {
		   return dbh.query(`INSERT INTO user (id, username, password) VALUES (?,?,?)`);
	   }));
   }
  );

it('Providing empty array as bound parameters produces error when they are expected',
   (done) => {
	   expectPromiseFails(done, initUserTable().then((dbh) => {
		   return dbh.query(`INSERT INTO user (id, username, password) VALUES (?,?,?)`, []);
	   }));
   }
  );

it('Providing too few bound parameters produces error',
   (done) => {
	   expectPromiseFails(done, initUserTable().then((dbh) => {
		   return dbh.query(`INSERT INTO user (id, username, password) VALUES (?,?,?)`, [1,'a']);
	   }));
   }
  );


/*
:TODO: broken in mysql -> just ignores extra parameters
it('Providing too many bound parameters produces error',
   (done) => {
	   expectPromiseFails(done, initUserTable().then((dbh) => {
		   return dbh.query(`INSERT INTO user (id, username, password) VALUES (?,?,?)`, [1,'a','b','c']);
	   }));
   }
);
*/
