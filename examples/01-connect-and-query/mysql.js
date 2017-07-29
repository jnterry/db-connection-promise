#!/usr/bin/env node
//
// Simple example of connecting to a mysql database
// and running a query

let AnyDbQ = require('../../any-db-q');
let Q      = require('q');

AnyDbQ({
	'adapter'  : 'mysql',
	'host'     : 'localhost',
	'user'     : 'root',
	'password' : 'test123',
	'database' : 'any_db_q_example_01',
})
	.then((dbh) => {
		console.log("Successfully connected to database");

		return dbh.query("SELECT * FROM email")
			.then((results) => {
				console.log("Got results from database!");
				console.log("Row count: " +  results.rowCount);
				console.log("Rows:");
				console.dir(results.rows);
			})
			.fail((err) => {
				console.error("Failed to perform database operation");
				console.dir(err);
				process.exit(2);
			})
			.finally(() => {
				console.log("Database operations completed");
				dbh.close();
			})
			.done();
	})
	.fail((err) => {
		console.error("Failed to connect to database");
		console.dir(err);
		process.exit(1);
	})
	.done(() => {
		console.log("Promise finished");
	});;
