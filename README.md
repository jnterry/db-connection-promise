# any-db-q

Simple wrapper around any-db module which converts the interface to be promise based, using the q library.

[![Build Status](https://travis-ci.org/jnterry/any-db-q.svg?branch=master)](https://travis-ci.org/jnterry/any-db-q) [![Coverage Status](https://coveralls.io/repos/github/jnterry/any-db-q/badge.svg?branch=master)](https://coveralls.io/github/jnterry/any-db-q?branch=master)

## WARNING - PRERELEASE

**WARNING: This library is currently in pre-release and the API may or may not be changed before final release.**

**The version will be bumped to 1.0.0 when the library is released**

Todo before 1.0.0 release
- Implement Postgres Tests
- Experiment with 'chain' API to avoid deeply nested promises
- Test using API in real project rather than just in tests ([nano-orm](https://github.com/jnterry/nano-orm))
- Better documentation
- Cleanup of code

## Usage

```javascript
let AnyDbQ = require('any-db-q');

AnyDbQ({ adapter  : 'mysql'
       , host     : 'localhost'
       , user     : 'root'
       , password : 'password'
       , database : 'test'
       })
    .then((dbh) => {
        return dbh.query('SELECT id, email, password FROM user')
            .then((results) => {
                console.log(results.rows[0].id);
                //...etc...
        });
});
```

Full example programs can be found in the /examples directory

## A Note on Different Database Adaptors

This library, like [any-db](https://www.npmjs.com/package/any-db) upon which it is based, is designed to provide a consistent interface to a number of databases. However it makes no attempt to hide the differences in how those databases operate.

For example, mysql supports the keyword [AUTO_INCREMENT](https://dev.mysql.com/doc/refman/5.7/en/example-auto-increment.html) where as sqlite3 does not - instead opting to auto-increments columns [which meet certain criteria](https://stackoverflow.com/a/7906029).

This library makes absolutely *NO* attempt to shield users from these differences; instead the intended use case is that users will pick a particular database and stick with it for the lifetime of their project, however by using any-db-q you can utilise the same q promise based interface regardless of which database you happen to choose.

### Supported Adaptors

Theoretically all any-db-XXX adaptors conform to the same interface, and so since this library works with one it should be compatible with all of them, however it is currently only tested against the following adaptors:
	- [sqlite3](https://www.npmjs.com/package/any-db-sqlite3)
	- [mysql](https://www.npmjs.com/package/any-db-mysql)
