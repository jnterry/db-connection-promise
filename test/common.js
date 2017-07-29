////////////////////////////////////////////////////////////////////////////
///                       Part of any-db-q                               ///
////////////////////////////////////////////////////////////////////////////
/// \file common.js
/// \author Jamie Terry
/// \date 2017/07/29
/// \brief Contains common code for running tests
////////////////////////////////////////////////////////////////////////////


global.expectPromiseFails = function(done, promise){
	return promise.then((results) => {
		done(new Error("Execution shouldn't reach here; no results expected", results));
	}).fail((error) => {
		done();
	});
};
