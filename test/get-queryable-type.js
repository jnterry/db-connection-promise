////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file get-queryable-type.js
/// \author Jamie Terry
/// \date 2018/01/03
/// \brief Contains tests for getQueryableType function
////////////////////////////////////////////////////////////////////////////

global.expect = require('chai').expect;

let AnyDbQ   = require('../any-db-q');
let AnyDb    = require('any-db');
let begin_tx = require('any-db-transaction');

describe("Bad Queryables", () => {
	function testBad(name, val){
		it(name, () => {
		let result = AnyDbQ.getQueryableType(val);
		expect(result.type   ).equal(null);
		expect(result.adapter).equal(null);
		});
	}

	testBad("undefined", undefined);
	testBad("null",      null     );
	testBad("1",         1        );
	testBad("Empty Object", {}    );
	testBad("Object w/ query field", { query : 1 });
	testBad("Object w/ query and adapter field", { query : 1, adapter: 'test'});
	testBad("Object w/ query and adapter object field", { query : 1, adapter: { name: 'test' }});
	testBad("Object w/ query function", { query : ()=>{} });
});

function testAdapter(suite_name, options){
	describe(suite_name, () => {
		it("connection", () => {
			let conn = AnyDb.createConnection(options);
			let val  = AnyDbQ.getQueryableType(conn);
			expect(val.type   ).equal('connection');
			expect(val.adapter).equal(options.adapter);
		});

		it("pool {1,1}", () => {
			let conn = AnyDb.createPool(options, {min: 1, max: 1});
			let val  = AnyDbQ.getQueryableType(conn);
			expect(val.type   ).equal('pool');
			expect(val.adapter).equal(options.adapter);
			conn.close();
		});

		it("pool {5,10}", () => {
			let conn = AnyDb.createPool(options, {min: 5, max: 10});
			let val  = AnyDbQ.getQueryableType(conn);
			expect(val.type   ).equal('pool');
			expect(val.adapter).equal(options.adapter);
			conn.close();
		});

		it("pool connection", (done) => {
			let pool = AnyDb.createPool(options, {min: 5, max: 10});
			pool.acquire((err, conn) => {
				if(err){ done(err); return; }
				let val  = AnyDbQ.getQueryableType(conn);
				expect(val.type   ).equal('connection');
				expect(val.adapter).equal(options.adapter);
				pool.release(conn);
				pool.close();
				done();
			});
		});

		it("connection transaction", (done) => {
			let conn = AnyDb.createConnection(options);
			begin_tx(conn, (err, tx) => {
				if(err) { done(err); return; }
				let val  = AnyDbQ.getQueryableType(tx);
				expect(val.type   ).equal('transaction');
				expect(val.adapter).equal(options.adapter);
				done();
			});
		});

		it("connection nested transaction", (done) => {
			let conn = AnyDb.createConnection(options);
			begin_tx(conn, (err, tx1) => {
				if(err) { done(err); return; }
				begin_tx(tx1, (err, tx2) => {
					if(err) { done(err); return; }
					let val  = AnyDbQ.getQueryableType(tx2);
					expect(val.type   ).equal('transaction');
					expect(val.adapter).equal(options.adapter);
					done();
				});
			});
		});

		it("pool transaction", (done) => {
			let pool = AnyDb.createPool(options, {min: 5, max: 10});
			begin_tx(pool, (err, tx) => {
				if(err) { done(err); return; }
				let val  = AnyDbQ.getQueryableType(tx);
				expect(val.type   ).equal('transaction');
				expect(val.adapter).equal(options.adapter);
				pool.close();
				done();
			});
		});

		it("pool nested transaction", (done) => {
			let pool = AnyDb.createPool(options, {min: 5, max: 10});
			begin_tx(pool, (err, tx1) => {
				if(err) { done(err); return; }
				begin_tx(tx1, (err, tx2) => {
					if(err) { done(err); return; }
					let val  = AnyDbQ.getQueryableType(tx2);
					expect(val.type   ).equal('transaction');
					expect(val.adapter).equal(options.adapter);
					pool.close();
					done();
				});
			});
		});

		it("pool connection transaction", (done) => {
			let pool = AnyDb.createPool(options, {min: 5, max: 10});
			pool.acquire((err, conn) => {
				begin_tx(conn, (err, tx) => {
					if(err) { done(err); return; }
					let val  = AnyDbQ.getQueryableType(tx);
					expect(val.type   ).equal('transaction');
					expect(val.adapter).equal(options.adapter);
				});
				pool.release(conn);
				pool.close();
				done();
			});
		});

		it("pool connection nested transaction", (done) => {
			let pool = AnyDb.createPool(options, {min: 5, max: 10});
			pool.acquire((err, conn) => {
				if(err) { done(err); return; }
				begin_tx(conn, (err, tx1) => {
					if(err) { done(err); return; }
					begin_tx(tx1, (err, tx2) => {
						if(err) { done(err); return; }
						let val  = AnyDbQ.getQueryableType(tx2);
						expect(val.type   ).equal('transaction');
						expect(val.adapter).equal(options.adapter);

					});
				});
				pool.release(conn);
				pool.close();
				done();
			});
		});
	});
}

testAdapter("sqlite3 in memory", { adapter: 'sqlite3'} );


if(process.env.ANY_DB_Q_TEST_SQLITE_FILE == true){
	let db_filename = process.env.ANY_DB_Q_TEST_SQLITE_FILE_FILENAME;
	if(db_filename === undefined){ db_filename = 'test_db.sqlite3'; }

	testAdapter("sqlite3 file", { adapter: 'sqlite3', database: db_filename } );
}

if(process.env.ANY_DB_Q_TEST_MYSQL == true){
	let db_password = process.env.ANY_DB_Q_TEST_MYSQL_PASSWORD;
	let db_name     = process.env.ANY_DB_Q_TEST_MYSQL_DATABASE;

	if(db_password === undefined){ db_password = '';          }
	if(db_name     === undefined){ db_name = 'any_db_q_test'; }

	testAdapter('mysql', { adapter  : 'mysql',
	                       host     : 'localhost',
	                       user     : 'root',
	                       password : db_password,
	                     });
}
