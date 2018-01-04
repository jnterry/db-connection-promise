////////////////////////////////////////////////////////////////////////////
///                           Part of any-db-q                           ///
////////////////////////////////////////////////////////////////////////////
/// \file any-db-q.js
/// \author Jamie Terry
/// \date 2017/07/28
/// \brief Main file for any-db-q, wraps the any-db library to provide an
/// interface using promises, via the Q library
////////////////////////////////////////////////////////////////////////////

"use strict";

let Q        = require('q');
let begin_tx = require('any-db-transaction');
let AnyDb    = require('any-db');

function _doCloseConnection(dbh){
	let defer = Q.defer();
	if(typeof dbh.destroy === 'function') {
		// Then its a MySQL standalone connection, call destroy to close
		return dbh.destroy();
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

function ConnectionPromise(queryable){
	let defer = Q.defer();

	this._queryable = null;
	this._promise    = defer.promise;

	let type = ConnectionPromise.getQueryableType(queryable);
	if(type.type == null || type.adapter == null){
		let err = new Error("Unknown queryable type, cannot create ConnectionPromise");
		defer.reject(err);
		throw err;
	}

	switch(type.type) {
	case 'pool':
		queryable.acquire((err, conn) => {
			if(err){
				defer.reject(err);
				return;
			}

			this._queryable = conn;
			defer.resolve(conn);
		});

		this.close = function() {
			this._promise = this._promise.then(() => {
				if(this._queryable == null){
					// :TODO: should this be an error?
					// Note that done() calls this method -> we don't want
					// to make .close().done() cause error
					// But not sure if it works for done() to do check,
					// since both methods will try to assign value to this._promise
					return;
				}
				queryable.release(this._queryable);
				this._queryable = null;
			});
			return this;
		};
		break;
	case 'transaction':
		this._queryable = queryable;

		let wrapper = (func_name) => {
			return () => {
				this._promise = this._promise.then(() => {
					let defer = Q.defer();
					queryable[func_name]((err) => {
						if(err){
							defer.reject(err);
						} else {
							defer.resolve(true);
						}
					});
					return defer.promise;
				});
				return this;
			};
		};

		this.commit   = wrapper('commit'  );
		this.rollback = wrapper('rollback');

		defer.resolve(queryable);
		break;
	case 'connection':
		this._queryable = queryable;
		this.close = function () {
			this._promise = this._promise.then(() => {
				if(this._queryable == null){
					// :TODO: should this be an error?
					// Note that done() calls this method -> we don't want
					// to make .close().done() cause error
					// But not sure if it works for done() to do check,
					// since both methods will try to assign value to this._promise
					return 1;
				}
				return _doCloseConnection(this._queryable);
			}).then(() => {
				this._queryable = null;
			});
			return this;
		};
		defer.resolve(queryable);
		break;
	default:
		let error = "Unknown queryable type - cannot create ConnectionPromise";
		defer.reject(error);
		throw error;
	}
};

ConnectionPromise.prototype.query = function(){
		let args = arguments; // capture arguments to function
		this._promise = this._promise.then(() =>
			Q.nfapply(this._queryable.query.bind(this._queryable), args)
		);
		return this;
};

/////////////////////////////////////////////////////////////////////
/// \brief Occasionally you need to use the result of a previous promised
/// step to generate the query string. This function can be used to do that
/// \param query_generator Function which is passed the result of the previous
/// promise in the chain, should return either a string representing the query,
/// or an array consisting of the arguments to the query (first being the query
/// string, next being an array of bound parameters)
/////////////////////////////////////////////////////////////////////
ConnectionPromise.prototype.queryfn = function(query_generator) {
	this._promise = this._promise.then((val) => {
		let query_args = query_generator(val);

		if(!Array.isArray(query_args)){
			query_args = [ query_args ];
		}
		return Q.nfapply(this._queryable.query.bind(this._queryable), query_args);
	});
	return this;
};

ConnectionPromise.prototype.fail = function(onRejected){
	this._promise = this._promise.fail(onRejected);
	return this;
};
ConnectionPromise.prototype.catch = ConnectionPromise.prototype.catch;

ConnectionPromise.prototype.then = function(onFulfilled, onRejected, onProgress){
	this._promise = this._promise.then(onFulfilled, onRejected, onProgress);
	return this;
};

ConnectionPromise.prototype.done = function(onFulfilled, onRejected, onProgress){
	if(typeof this.close === 'function'){
		this.close();
	}
	// :TODO: should we auto commit/rollback a transaction?
	//        -> if so need to keep track of if committed/rolledback, since can't
	//           do it twice
	this._promise = this._promise
		.done(onFulfilled, onRejected, onProgress);

	return this;
};

ConnectionPromise.prototype.transaction = function(operations){
	this._promise = this._promise.then(() => {
		let defer = Q.defer();

		begin_tx(this._queryable, { autoRollback: false }, (err, tx) => {
			if(err){
				defer.reject(err);
				return;
			}

			let dbh_tx = new ConnectionPromise(tx);

			let doAction = (func_name) => {
				tx[func_name]((err) => {
					if(err){ defer.reject(err);   }
					else   { defer.resolve(true); }
				});
			};

			let manually_closed = false;
			tx.on('close', () => { manually_closed = true; });
			let operation = '';
			operations(dbh_tx)
				.then(() => { operation = 'commit';   },
				      () => { operation = 'rollback'; }
				     )
				.then(() => {
					if(!manually_closed){
						doAction(operation);
					} else {
						defer.resolve(true);
					}
				})
				.done();
		});

		return defer.promise;
	});
	return this;
};

/////////////////////////////////////////////////////////////////////
/// \brief Gets the queryable that this ConnectionPromise is wrapping
/////////////////////////////////////////////////////////////////////
ConnectionPromise.prototype.getQueryable = function(){
	return this._queryable;
};

/////////////////////////////////////////////////////////////////////
/// \brief Gets the promise representing the chain of actions to perform
/// with this connection.
/// This method may be useful if you want to return a promise from a promise
/// in order to wait on its completion
/// :TODO: Ideally we would just be able to return a ConnectionPromise
/// Can we somehow extend the Q notion of a promise rather than creating
/// our own type? That would also solve the problem of not having access to
/// some q methods on our ConnectionPromise (eg, all, spread etc)
/// -> these could be added manually
/////////////////////////////////////////////////////////////////////
ConnectionPromise.prototype.getPromise = function(){
	return this._promise;
};

/////////////////////////////////////////////////////////////////////
/// \brief Determines the type of a queryable
/// \return object of following form:
/// { type    : "connection" | "pool" | "transaction" | null,
///   adapter : "mysql" | "sqlite3" | ... | null,
/// }
/// null values will be used when the type cannot be determined
/////////////////////////////////////////////////////////////////////
ConnectionPromise.getQueryableType = function(queryable) {
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
	} else if (typeof queryable.query === 'function'){
		result.type = "connection";
	}

	return result;
};

/////////////////////////////////////////////////////////////////////
/// \brief Method version of getQueryableType that operates
/// on the queryable of this ConnectionPromise
/// This is a chain operator that should be inserted in a list
/// of promise like operations, return value can be accessed by following with
/// a then. Eg:
/// dbh.getQueryableType().then((type) => { /* ... */ });
/////////////////////////////////////////////////////////////////////
ConnectionPromise.prototype.getQueryableType = function() {
	this._promise = this._promise.then(() => {
		return ConnectionPromise.getQueryableType(this._queryable);
	});
	return this;
};

module.exports = ConnectionPromise;
