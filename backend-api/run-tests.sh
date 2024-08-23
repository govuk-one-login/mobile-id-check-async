#!/bin/bash
set -eu

cd /backend-api

mkdir -pv results

if npm run test:unit --ci --silent; then
  cp -rf results $TEST_REPORT_ABSOLUTE_DIR
else
  cp -rf results $TEST_REPORT_ABSOLUTE_DIR
  exit 1
fi

# if [[ "$ENVIRONMENT" == "dev" ]] || [[ "$ENVIRONMENT" == "build" ]]; then
#   if npm run test:e2e --ci --silent; then
#     cp -rf results $TEST_REPORT_ABSOLUTE_DIR
#   else
#     cp -rf results $TEST_REPORT_ABSOLUTE_DIR
#     exit 1
#   fi
# elif [[ "$ENVIRONMENT" == "staging" ]]; then
#   if npm run test:stage --ci --silent; then
#     cp -rf results $TEST_REPORT_ABSOLUTE_DIR
#   else
#     cp -rf results $TEST_REPORT_ABSOLUTE_DIR
#     exit 1
#   fi
# fi
