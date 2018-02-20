#!/usr/bin/env bash
#
# Generates documentation for nano-orm

set -e

pushd $(dirname "${0}") > /dev/null
SCRIPTDIR=$(pwd -L)
popd > /dev/null

rm -rf ${SCRIPTDIR}/docs/

$SCRIPTDIR/node_modules/jsdoc/jsdoc.js \
		${SCRIPTDIR}/db-connection-promise.js \
		-R ${SCRIPTDIR}/README.md \
		-d ${SCRIPTDIR}/docs/ \
		-t ${SCRIPTDIR}/node_modules/minami \
