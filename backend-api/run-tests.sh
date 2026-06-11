#!/bin/bash
set -eu

cd /backend-api

remove_quotes() {
  echo "$1" | tr -d '"'
}
export PROXY_API_URL=$(remove_quotes "$CFN_ProxyApiUrl")
export PRIVATE_API_URL=$(remove_quotes "$CFN_PrivateApiUrl")
export SESSIONS_API_URL=$(remove_quotes "$CFN_SessionsApiUrl")
export STS_MOCK_API_URL=$(remove_quotes "$CFN_StsMockApiUrl")
export TEST_RESOURCES_API_URL=$(remove_quotes "$CFN_TestResourcesApiUrl")
export READ_ID_MOCK_API_URL=$(remove_quotes "$CFN_ReadIdMockApiUrl")

export EXPECTED_DVLA_DRIVING_LICENCE_EXPIRY_GRACE_PERIOD_IN_DAYS=90

if [[ "$TEST_ENVIRONMENT" == "dev" ]] || [[ "$TEST_ENVIRONMENT" == "staging" ]]; then
  export EXPECTED_RESIDENCE_PERMIT_EXPIRY_GRACE_PERIOD_IN_MONTHS=24
else
  export EXPECTED_RESIDENCE_PERMIT_EXPIRY_GRACE_PERIOD_IN_MONTHS=18
fi

mkdir -pv results

if [[ "$TEST_ENVIRONMENT" == "dev" ]] || [[ "$TEST_ENVIRONMENT" == "build" ]]; then
  if npm run test:api; then
    cp -rf results $TEST_REPORT_ABSOLUTE_DIR
  else
    cp -rf results $TEST_REPORT_ABSOLUTE_DIR
    exit 1
  fi
fi
