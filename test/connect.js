////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file 01-connect.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains tests for getting a connection to the database
////////////////////////////////////////////////////////////////////////////

"use strict";

var expect = require('chai').expect;
var AnyDbQ = require('../any-db-q');

function isValidConnection(connection){
	expect(connection).to.exist;
	expect(connection.query).to.be.a('function');
	return connection;
}

function connectFails(done, options){
	AnyDbQ(options)
		.then((connection) => {
			done(new Error("Execution shouldn't get here; " +
			               "a connection was returned")
						);
		}).fail((error) => {
			expect(error).to.exist;
			done();
		});
}

it('Single connection returns valid connection', () => {
	return AnyDbQ({
		'adapter'  : 'sqlite3',
	}).then(isValidConnection);
});

it('Pool connection returns valid connection', () => {
	return AnyDbQ({
		'adapter' : 'sqlite3',
		'pool'     : { min : 2, max : 32 }
	}).then(isValidConnection);
});

it('Invalid adapter value returns invalid connection', (done) => {
	return connectFails(done, {'adapter' : 'fake'});
});

it('Bad credentials return invalid connection', (done) => {
	return connectFails(done, {
		'adapter'   : 'mysql',
		'host'      : 'localhost',
		'user'      : 'X_BAD_USER_X',
		'password'  : '_A_PASSWORD_'
	});
});

it('Bad port return invalid connection', (done) => {
	return connectFails(done, {
		'adapter'   : 'mysql',
		'host'      : 'localhost',
		'user'      : 'X_BAD_USER_X',
		'password'  : '_A_PASSWORD_',
		'port'      : '-1'
	});
});
