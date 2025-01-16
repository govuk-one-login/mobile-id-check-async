#!/bin/bash
set -eu

cd /sts-mock

remove_quotes() {
  echo "$1" | tr -d '"'
}

export STS_MOCK_API_URL=$(remove_quotes "$CFN_StsMockApiUrl")

if npm run test:api; then
    cp -rf results "$TEST_REPORT_ABSOLUTE_DIR"
else
    cp -rf results "$TEST_REPORT_ABSOLUTE_DIR"
    exit 1
fi
