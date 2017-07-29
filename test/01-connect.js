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

describe('AnyDbQ', () => {
	describe('connect', () => {

		function isValidConnection(connection){
			expect(connection).to.exist;
			expect(connection.query).to.be.a('function');
			return connection;
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
	});
});
