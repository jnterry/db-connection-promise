#!/usr/bin/env node
//
// Simple example of connecting to a mysql database
// and running a query

let AnyDbQ = require('../../any-db-q');
let Q      = require('q');

let dbPool = new AnyDbQ({
	'adapter'  : 'mysql',
	'host'     : 'localhost',
	'user'     : 'root',
	'password' : 'test123',
	'database' : 'any_db_q_example_01',
});

let dbh = dbPool.getConnection();

dbh.fail((err) => {
	console.error("Failed to connect to database");
	console.dir(err);
	process.exit(1);
});

dbh.query("SELECT * FROM email")
	.then((results) => {
		console.log("Got results from database!");
		console.log("Row count: " +  results.rowCount);
		console.log("Rows:");
		console.dir(results.rows);
	});

dbh.close();

console.log("Enqueued close all connections");
dbPool.closeAllConnections();
console.log("Script terminated");
