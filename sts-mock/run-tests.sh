#!/bin/bash
set -eu

remove_quotes() {
  echo "$1" | tr -d '"'
}

cd /sts-mock

export STS_MOCK_API_URL=$(remove_quotes "$CFN_StsMockApiUrl")

if npm run test:api; then
    cp -rf results "$TEST_REPORT_ABSOLUTE_DIR"
else
    cp -rf results "$TEST_REPORT_ABSOLUTE_DIR"
    exit 1
fi
