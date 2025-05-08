#!/bin/bash
set -eu

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  STACK_IDENTIFIER="$1"
  BACKEND_STACK_NAME="${STACK_IDENTIFIER}-async-backend"
else
  # default stack name in dev
  BACKEND_STACK_NAME="mob-async-backend"
fi

echo "Generating .env file for the $BACKEND_STACK_NAME stack"

# Retrieve backend stack outputs
stack_outputs=$(aws cloudformation describe-stacks \
  --stack-name "$BACKEND_STACK_NAME" \
  --query "Stacks[0].Outputs[*].{key: OutputKey, value: OutputValue}" \
  --output text)

if [[ $? -ne 0 ]]; then
  echo "Error: aws command failed" >&2  # Print error to stderr
  exit 1
fi

# Read AWS output and export each line as a key=value pair
while IFS=$'\t' read -r key value; do
  export "$key"="$value"
done <<< "$stack_outputs"

echo "TEST_ENVIRONMENT=dev" > .env
{
  echo "IS_LOCAL_TEST=true"
  echo "PRIVATE_API_URL=${PrivateApiUrl}"
  echo "PROXY_API_URL=${ProxyApiUrl}"
  echo "SESSIONS_API_URL=${SessionsApiUrl}"
  echo "STS_MOCK_API_URL=${StsMockApiUrl}"
  echo "EVENTS_API_URL=${EventsApiUrl}"
  echo "TEST_RESOURCES_API_URL=${TestResourcesApiUrl}"
} >> .env
