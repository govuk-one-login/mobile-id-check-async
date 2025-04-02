#!/bin/bash
set -eu

remove_quotes() {
  echo "$1" | tr -d '"'
}

cd /test-resources

export STS_MOCK_API_URL=$(remove_quotes "$CFN_StsMockApiUrl")
export SESSIONS_API_URL=$(remove_quotes "$CFN_SessionsApiUrl")
export PROXY_API_URL=$(remove_quotes "$CFN_ProxyApiUrl")
export EVENTS_API_URL=$(remove_quotes "$CFN_EventsApiUrl")
export TEST_RESOURCES_API_URL=$(remove_quotes "$CFN_TestResourcesApiUrl")

if npm run test:api; then
    cp -rf results "$TEST_REPORT_ABSOLUTE_DIR"
else
    cp -rf results "$TEST_REPORT_ABSOLUTE_DIR"
    exit 1
fi
