# Db Connection Promise

This library provides a class "DbConnectionPromise" which adhears to the Promises/A+ specification, but additionally wraps a [any-db](https://www.npmjs.com/package/any-db) database connection. This allows for an additional chainable .query() method which behaves in a similar manner to .then().

This allows for a clean API for querying databases of any sort.

[![Build Status](https://travis-ci.org/jnterry/db-connection-promise.svg?branch=master)](https://travis-ci.org/jnterry/db-connection-promise) [![Coverage Status](https://coveralls.io/repos/github/jnterry/db-connection-promise/badge.svg?branch=master)](https://coveralls.io/github/jnterry/db-connection-promise?branch=master)

## WARNING - PRERELEASE

**WARNING: This library is currently in pre-release and the API may or may not be changed before final release.**

**The version will be bumped to 1.0.0 when the library is released**

Todo before 1.0.0 release
- Implement Postgres Tests
- Test using API in real project rather than just in tests ([nano-orm](https://github.com/jnterry/nano-orm))
- Check ConnectionPromise fully meets the Promises/A+ specification
- Can we wrap other Promise types (eg, javascript native promises)? Should be able to wrap anything that meets Promises/A+ spec
- Work out the peerDependency vs dependency stuff (see any-db docs)
- Grep for :TODO: in code
- Cleanup of code
- Documentation for close, commit, rollback is confusing - implement as sub classes?
- Documentation/examples confusing - we import DbConnectionPromise, but really this is the method makeDbConnectionPromise. Maybe change to import dbcp. Then dbcp.wrap(...) or dbcp.getQueryableType(...), etc.

## Usage

```javascript
let DbConnectionPromise = require('db-connection-promise');

let conn = AnyDb.createConnection({ adapter: 'sqlite3'});
let dbh = DbConnectionPromise(conn);

dbh
	.fail((err) => {
		console.error("Failed to connect to database");
		console.dir(err);
		process.exit(1);
	})
	.query("SELECT * FROM user")
	.then((results) => {
		console.log("Loaded " + results.rows.length + " users from the database");
		console.log("First user: " + results.rows[0].username + ", " + results.rows[0].password);
	})
	.close()
	.then(() => {
		console.log("Database connection has been closed");
	})
	.done();
```

Full example programs can be found in the /examples directory

## A Note on Different Database Adaptors

This library, like [any-db](https://www.npmjs.com/package/any-db) upon which it is based, is designed to provide a consistent interface to a number of databases. However it makes no attempt to hide the differences in how those databases operate.

For example, mysql supports the keyword [AUTO_INCREMENT](https://dev.mysql.com/doc/refman/5.7/en/example-auto-increment.html) where as sqlite3 does not - instead opting to auto-increments columns [which meet certain criteria](https://stackoverflow.com/a/7906029).

This library makes absolutely *NO* attempt to shield users from these differences; instead the intended use case is that users will pick a particular database and stick with it for the lifetime of their project, however by using db-connection-promise you can utilise the same q promise based interface regardless of which database you happen to choose.

### Supported Adaptors

Theoretically all any-db-XXX adaptors conform to the same interface, and so since this library works with one it should be compatible with all of them, however it is currently only tested against the following adaptors:

- [any-db-sqlite3](https://www.npmjs.com/package/any-db-sqlite3)
- [any-db-mysql](https://www.npmjs.com/package/any-db-mysql)

## Installation

- Add db-connection-promise to your dependencies in package.json
- Install the adapter for the database you are planning to use. For example, any-db-sqlite3 or any-db-mysql
