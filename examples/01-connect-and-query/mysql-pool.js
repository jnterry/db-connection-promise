#!/usr/bin/env node
//
// Simple example of connecting to a mysql database
// and running a query

let AnyDb  = require('any-db');

let AnyDbQ = require('../../any-db-q');

var pool = AnyDb.createPool({
	'adapter'  : 'mysql',
	'host'     : 'localhost',
	'user'     : 'root',
	'password' : 'test123',
	'database' : 'any_db_q_example_01',
}, {min: 2, max: 10});

let dbh = AnyDbQ(pool);

dbh
	.fail((err) => {
		console.error("Failed to connect to database");
		console.dir(err);
		process.exit(1);
	})
	.query("SELECT * FROM email")
	.then((results) => {
		console.log("Got results from database!");
		console.log("Row count: " +  results.rowCount);
		console.log("Rows:");
		console.dir(results.rows);
	})
	.close()
	.then(() => {
		pool.close();
	})
	.done();
