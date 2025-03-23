#!/bin/bash

set -eu

expected_account=211125300205
caller_account="$(aws sts get-caller-identity | jq --raw-output .Account)"

if [ "$expected_account" != "$caller_account" ]; then
    echo "You are not authenticated to the correct AWS account"
    echo "You are using credentials for $caller_account"
    echo "Ensure you are using credentials for: 058264551042"
    exit 1
fi
url="https://test-sessions-sandy-test-resources.review-b-async.dev.account.gov.uk"

aws_credentials=$( aws configure export-credentials )
access_key_id=$( echo "$aws_credentials" | jq -r .AccessKeyId )
secret_access_key=$( echo "$aws_credentials" | jq -r .SecretAccessKey )
session_token=$( echo "$aws_credentials" | jq -r .SessionToken )

echo

  curl --verbose -X PUT --fail-with-body --silent --data '{sessionId: "12345678", sessionState: "ASYNC_AUTH_SESSION_CREATED", timeToLive: "1742836856"}' \
  --user "${access_key_id}":"${secret_access_key}" \
  --header "x-amz-security-token: ${session_token}" \
  --header "Content-Type: application/json" \
  --aws-sigv4 "aws:amz:eu-west-2:execute-api" \
  ${url}/session
