#!/usr/bin/env node
////////////////////////////////////////////////////////////////////////////
///                    Part of db-connection-promise                     ///
////////////////////////////////////////////////////////////////////////////
/// \file mysql-standalone.js
///
/// \brief Simple example of connecting to a mysql database and running a query
////////////////////////////////////////////////////////////////////////////

let AnyDb               = require('any-db');
let DbConnectionPromise = require('../../db-connection-promise');

var conn = AnyDb.createConnection({
	'adapter'  : 'mysql',
	'host'     : 'localhost',
	'user'     : 'root',
	'password' : 'test123',
	'database' : 'any_db_q_example_01',
});

let dbh = DbConnectionPromise(conn);

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
		console.log("Database connection has been closed");
	})
	.done();
