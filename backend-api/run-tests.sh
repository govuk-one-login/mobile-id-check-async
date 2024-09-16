#!/bin/bash
set -eu

cd /backend-api

remove_quotes() {
  echo "$1" | tr -d '"'
}
export PROXY_API_URL=$(remove_quotes "$CFN_ProxyApiUrl")
export PUBLIC_API_URL=$(remove_quotes "$CFN_PublicApiUrl")

mkdir -pv results

if npm run test:unit --ci --silent; then
  cp -rf results $TEST_REPORT_ABSOLUTE_DIR
else
  cp -rf results $TEST_REPORT_ABSOLUTE_DIR
  exit 1
fi

if [[ "$TEST_ENVIRONMENT" == "dev" ]] || [[ "$TEST_ENVIRONMENT" == "build" ]]; then
  if npm run test:api; then
    cp -rf results $TEST_REPORT_ABSOLUTE_DIR
  else
    cp -rf results $TEST_REPORT_ABSOLUTE_DIR
    exit 1
  fi
fi

#     cp -rf results $TEST_REPORT_ABSOLUTE_DIR
#     exit 1
#   fi
# fi
