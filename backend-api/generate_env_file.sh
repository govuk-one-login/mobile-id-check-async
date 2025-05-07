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

# Retrieve backend stack outputs, format to key=value pairs, and export
eval $(awk 'export $1' <(\
  aws cloudformation describe-stacks \
  --stack-name $BACKEND_STACK_NAME \
  --query "Stacks[0].Outputs[*].{key: OutputKey, value: OutputValue}" \
  --output text \
  | sed -r "s/\t/=/"))

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
