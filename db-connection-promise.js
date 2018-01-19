////////////////////////////////////////////////////////////////////////////
///                    Part of db-connection-promise                     ///
////////////////////////////////////////////////////////////////////////////
/// \file db-connection-promise.js
/// \author Jamie Terry
/// \date 2017/07/28
/// \brief Main file for db-connection-promise, wraps the any-db library to
/// create a class which behaves as a promise, but with additional methods
/// to access a database
////////////////////////////////////////////////////////////////////////////

"use strict";

let Q        = require('q');
let begin_tx = require('any-db-transaction');
let AnyDb    = require('any-db');

function _doCloseConnection(dbh){
	let defer = Q.defer();
	if(typeof dbh.destroy === 'function') {
		// Then its a MySQL standalone connection, call destroy to close
		dbh.destroy();
		defer.resolve(true);
	} else if (dbh._db !== undefined && typeof dbh._db.close === 'function') {
		// Then is a sqlite3 connection

		// :TODO: this results in a segfault - bug with underlying library?
		// however sqlite3 connection doesn't keep the app alive like a mysql
		// one, so closing it isnt as vital...

		//dbh._db.close((err, result) => {
		//	console.log("Closed sqlite3 connection, err:");
		//	console.log(err);
		//	console.log("result:");
		//	console.log(result);
		//});
		defer.resolve(true);
	} else {
		console.log("Can't determine how to close the connection: ");
		console.dir(dbh);
		let err = new Error("Unsupported database adapter - cannot be closed");
		defer.reject(err);
		throw err;
	}
	return defer.promise;
}

function DbConnectionPromise(queryable, promise){
	this._promise   = promise;

	if(queryable.constructor === DbConnectionPromise){
		// Ensure optional methods attached to old DbConnectionPromise
		// carry forward to the new one
		this.close      = queryable.close;
		this.rollback   = queryable.rollback;
		this.commit     = queryable.commit;

		this._queryable = queryable._queryable;
	} else {
		this._queryable = queryable;
	}
};

DbConnectionPromise.prototype.query = function(){
	let args = arguments; // capture arguments to function
	return new DbConnectionPromise(this, this._promise.then(() => {
		return Q.nfapply(this._queryable.it.query.bind(this._queryable.it), args);
	}));
};


// :TODO: can we generically generate these methods for all methods
// attached to a Q promise?
DbConnectionPromise.prototype.fail = function(){
	return new DbConnectionPromise(this, this._promise.fail(...arguments));
};
DbConnectionPromise.prototype.catch = DbConnectionPromise.prototype.catch;

DbConnectionPromise.prototype.then = function(){
	return new DbConnectionPromise(this, this._promise.then(...arguments));
};

/////////////////////////////////////////////////////////////////////
/// \brief Closes the connection (if still open), then behaves as Q.done()
/////////////////////////////////////////////////////////////////////
DbConnectionPromise.prototype.done = function(){
	return this._promise.then(() => {
		if(typeof this.close  === 'function' &&
		   this._queryable.it !=  null){
			return this.close();
		}
		// :TODO: should we auto commit/rollback a transaction?
		//        -> if so need to keep track of if committed/rolledback, since can't
		//           do it twice
	}).done(...arguments);
};

DbConnectionPromise.prototype.transaction = function(operations){
	return new DbConnectionPromise(this,
		this._promise.then(() => {
			let defer = Q.defer();

			let operations_result = undefined;

			begin_tx(this._queryable.it, { autoRollback: false }, (err, tx) => {
				if(err){
					defer.reject(err);
					return;
				}

				let dbh_tx = makeDbConnectionPromise(tx);

				let manually_closed = false;
				tx.on('close', () => { manually_closed = true; });
				try {
					operations(dbh_tx)
						.then(
							(val) => {
								operations_result = val;
								let retval = dbh_tx;
								if(!manually_closed){ retval = retval.commit(); }
								retval = retval.then(() => { defer.resolve(val); });
								return retval;
							},
							(err) => {
								let retval = dbh_tx;
								if(!manually_closed){ retval = retval.rollback(); }
								retval.then(() => { defer.reject (err); });
								return retval;
							}
						);
				} catch (err) {
					defer.reject(err);
			  }
			});

			return defer.promise.then(() => { return operations_result; });
		})
	);
};

/////////////////////////////////////////////////////////////////////
/// \brief Determines the type of a queryable
/// \return object of following form:
/// { type    : "connection" | "pool" | "transaction" | null,
///   adapter : "mysql" | "sqlite3" | ... | null,
/// }
/// null values will be used when the type cannot be determined
/////////////////////////////////////////////////////////////////////
function getQueryableType(queryable) {
	let result = { type: null, adapter: null };

	if(queryable == null                    ) { return result; }
	if(queryable.adapter == null            ) { return result; }
	if(queryable.adapter.name == null       ) { return result; }
	if(typeof queryable.query !== 'function') { return result; }

	result.adapter = queryable.adapter.name;

	if(typeof queryable.acquire === 'function' &&
	   typeof queryable.release === 'function'){
		result.type = "pool";
	} else if (typeof queryable.commit   === 'function' &&
	           typeof queryable.rollback === 'function' &&
	           // :TODO: -> standard connections have these methods too :(
	           // we want to check if its actually a transaction, below line
	           // relies on internal implementation details of any-db-transaction
	           // can we think of anything more robust?
	           (queryable._nestingLevel != null || queryable._autoRollback != null)){
		result.type = "transaction";
	} else {
		result.type = "connection";
	}

	return result;
};

/////////////////////////////////////////////////////////////////////
/// \brief Method version of getQueryableType that operates
/// on the queryable of this DbConnectionPromise
/// This is a chain operator that should be inserted in a list
/// of promise like operations, return value can be accessed by following with
/// a then. Eg:
/// dbh.getQueryableType().then((type) => { /* ... */ });
/////////////////////////////////////////////////////////////////////
DbConnectionPromise.prototype.getQueryableType = function() {
	this._promise = this._promise.then(() => {
		return getQueryableType(this._queryable.it);
	});
	return this;
};

function makeDbConnectionPromise(queryable){
	let type = getQueryableType(queryable);

	let deferred = Q.defer();

	// The DbConnectionPromise's ._queryable is actually an object of type:
	// { it: <queryable> }
	//
	// Consider code like the following:
	// makeDbConnectionPromise(conn)
	//   .query(() => { ... })
	//   .then (() => { ... })
	// query and then return a new DbConnectionPromise (just as .then() should
	// return a new Promise according to the Promise/A spec, rather than mutating
	// the original)
	//
	// Note however that the query and then functions are executed by the
	// code building the promise, and thus may occur before the initial
	// promise "makeDbConnectionPromise" resolves. This only affects making a
	// DbConnectionPromise from a pool, since that is an async task.
	// When we create a new DbConnectionPromise we copy the _queryable from
	// the parent. If this is done before we have filled in _queryable with
	// the correct value we would copy the value of null into the DbConnectionPromise
	// returned from query and then. Hence when we execute the code in the response
	// handlers we get errors as they try to operate on a null queryable.
	// Instead we store a reference to an object which contains the queryable instance.
	// Hence once we actually get access to the queryable we set ._queryable.it to
	// the correct value and all DbConnectionPromises made from the original one here
	// will be automatically updated.
	// This would be like having a double pointer in C, so that we can patch up
	// the inner pointer to a new value from a single point of code, eg:
	// Queryable*  queryable = nullptr;
	// Queryable** queryable_ref = &queryable;
	// // later on
	// *queryable_ref = &actual_queryable;
	// But any copies of queryable_ref we have made will also now refer to
	// actual_queryable when double dereferenced.
	//
	// Alternative solutions would be to have this function either return a
	// promise which resolves to a DbConnectionPromise, or take a callback, but
	// then all code using the DbConnectionPromise has to be wrapped up 1 level
	// deeper in callbacks, which is undesirable.
	// Note also returning a Promise which resolves to a DbConnectionPromise
	// is not actually possible, since if we try to .resolve(x) where x is a thenable
	// the promise spec states we should resolve with the final result of x.
	// Hence this method would have to return a promise which resolves to an object
	// which contains the DbConnectionPromise which is not very intuitive for users
	// of the library.
	//
	// Note that ensuring .then and .query return new DbConnectionPromise instances
	// rather than just mutating the internal state is important as it enables code
	// such as the following:
	// dbh.query("...")
	//    .then((result) => {
	//   if(result[0].thing){
	//     return dbh.query(...);
	//   } else {
	//     return dbh.query(...).then(...);
	//   }
	// }
	// IE: we can call methods of dbh inside a response handler
	// being called by dbh.then. If we mutate the state of dbh inside then/query etc
	// this will cause strange bugs as the state is overwritten by one or
	// the other call to then.
	// Having this dynamic generation of query strings/behaviour is required
	// to support many operations. This was previously solved by the hacky
	// queryfn which generated the string to use as a query - but this
	// didn't allow different control flows, just different queries.
	// See: https://github.com/jnterry/db-connection-promise/blob/970b45b79009044962cb792365021171aa43f865/any-db-q.js#L156
	let result = new DbConnectionPromise({it: null}, deferred.promise);

	switch(type.type) {
	case 'pool': {
		queryable.acquire((err, conn) => {
			if(err){
				deferred.reject(err);
				return;
			}

			result._queryable.it = conn;
			deferred.resolve();
		});

		result.close = function() {
			// Close method returns a standard promise, since we cannot continue
			// to use the connection after a close
			return this._promise.then(() => {
				if(this._queryable.it == null){ return; }
				queryable.release(this._queryable.it);
				this._queryable.it = null;
			});
		};

		break;
	}
	case 'transaction': {
		result._queryable.it = queryable;

		result.commit = function(){
			return new DbConnectionPromise(this, this._promise.then((val) => {
				let defer = Q.defer();
				queryable.commit((err) => {
					if(err){ defer.reject (err); }
					else   { defer.resolve(val); }
				});
				return defer.promise;
			}));
		};

		result.rollback = function(){
			return new DbConnectionPromise(this, this._promise.then((val) => {
				let defer = Q.defer();
				queryable.rollback((err) => {
					if(err){ defer.reject (err); }
					else   { defer.resolve(   ); }
				});
				return defer.promise;
			}));
		};

		deferred.resolve();
		break;
	}
	case 'connection': {
		result._queryable.it = queryable;
		result.close = function () {
			return this._promise.then(() => {
				return _doCloseConnection(this._queryable.it);
			});
		};
		deferred.resolve();
		break;
	}
	default:
		let error = new Error("Unknown queryable type - cannot create DbConnectionPromise");
		deferred.reject(error);
		throw error;
	}

	return result;
}

makeDbConnectionPromise.getQueryableType = getQueryableType;

module.exports = makeDbConnectionPromise;
