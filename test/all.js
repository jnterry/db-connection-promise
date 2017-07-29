////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file 02-simple-query.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Tests for running simple queries against the database
////////////////////////////////////////////////////////////////////////////

"use strict";

function importTest(name, path){
	if(path == null){ path = name; }

	describe(name, function(){
		require("./" + path);
	});
}

describe('AnyDbQ', () => {
	importTest('connect');
	importTest('query-simple');
	importTest('query-bound-params');
});
