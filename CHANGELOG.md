* Tue Feb 20 2018 Jamie Terry <jamie-terry@outlook.com> 0.4.4
  - Add jsdoc style documentation
* Mon Feb 05 2018 Jamie Terry <jamie-terry@outlook.com> 0.4.3
  - Don't close connection as part of done()
* Mon Jan 27 2018 Jamie Terry <jamie-terry@outlook.com> 0.4.2
  - Add finally method to wrap Q's version
* Fri Jan 19 2018 Jamie Terry <jamie-terry@outlook.com> 0.4.1
  - Fix implicit close performed by done()
  - Increase test coverage
  - Ensure values returned from transaction propagate to next then clause after transaction
  - Ensure errors thrown in transaction propagate to next fail clause after transaction
* Wed Jan 10 2018 Jamie Terry <jamie-terry@outlook.com> 0.4.0
  - Full rewrite and change of API
  - Create ConnectionPromise wrapper
  - Rename package to "db-connection-promise"
* Wed Jan 10 2018 Jamie Terry <jamie-terry@outlook.com> 0.3.1
  - Deprecate any-db-q, package will be renamed to "db-connection-promise"
* Fri Aug 18 2017 Jamie Terry <jamie-terry@outlook.com> 0.3.0
  - Implement close method for MySQL standalone connections
* Mon Jul 31 2017 Jamie Terry <jamie-terry@outlook.com> 0.2.0
  - Implement promise based interface for database transactions
* Sat Jul 29 2017 Jamie Terry <jamie-terry@outlook.com> 0.1.1
  - Fix connection .close method
* Sat Jul 29 2017 Jamie Terry <jamie-terry@outlook.com> 0.1.0
  - Initial release
  - Add promise interface for getting connection
  - Add promise interface for running query against the DB
