#!/usr/bin/env bash
#
# This script sets up the environment variables for testing the library against
# different types of database adapter (by default, only tested against in memory
# sqlite3 database)

set -e;

echo "Run this script as . ./setup_test_env.sh to ensure it modifies the ENV"
echo "of your current shell, and not just the subshell it is running in"
echo ""

read -p "Test against Sqlite3 File database? [y/n] " choice
if [[ $choice =~ [yY](es)* ]]; then
	read -p "Enter database name: [Enter for default: testdb.sqlite3] " filename
	if [[ $filename == '' ]]; then
		filename=testdb.sqlite3
	fi
	if [[ $filename =~ [^\.]+ ]]; then
		filename="$filename.sqlite3"
	fi

	export DBCP_TEST_SQLITE_FILE=1
	export DBCP_TEST_SQLITE_FILE_FILENAME=$filename
else
	export DBCP_TEST_SQLITE_FILE=0
fi

echo ""

read -p "Test against MySql? [y/n] " choice
if [[ $choice =~ [yY](es)* ]]; then
   read -p "Enter database name: [Enter for default: db_connection_promise_test] " db_name
   if [[ $db_name == '' ]]; then
	   db_name=db_connection_promise_test
   fi

   read -p "Enter username: [Enter for default: root] " db_user
   if [[ $db_user == '' ]]; then
	   db_user='root'
   fi

   read -p "Enter password: [Enter for blank] " db_pass

   export DBCP_TEST_MYSQL=1
   export DBCP_TEST_MYSQL_USERNAME=$db_user
   export DBCP_TEST_MYSQL_PASSWORD=$db_pass
else
	export DBCP_TEST_MYSQL=0
fi
