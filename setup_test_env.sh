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
	read -p "Enter database name: [Enter for default: any_db_q_test] " filename
	if [[ $filename == '' ]]; then
		filename=any_db_q_test
	fi
	if [[ $filename =~ [^\.]+ ]]; then
		filename="$filename.sqlite3"
	fi

	export ANY_DB_Q_TEST_SQLITE_FILE=1
	export ANY_DB_Q_TEST_SQLITE_FILE_FILENAME=$filename
else
	export ANY_DB_Q_TEST_SQLITE_FILE=0
fi

echo ""

read -p "Test against MySql? [y/n] " choice
if [[ $choice =~ [yY](es)* ]]; then
   read -p "Enter database name: [Enter for default: any_db_q_test] " db_name
   if [[ $db_name == '' ]]; then
	   db_name=any_db_q_test
   fi

   read -p "Enter username: [Enter for default: root] " db_user
   if [[ $db_user == '' ]]; then
	   db_user='root'
   fi

   read -p "Enter password: [Enter for blank] " db_pass

   export ANY_DB_Q_TEST_MYSQL=1
   export ANY_DB_Q_TEST_MYSQL_USERNAME=$db_user
   export ANY_DB_Q_TEST_MYSQL_PASSWORD=$db_pass
else
	export ANY_DB_Q_TEST_MYSQL=0
fi
