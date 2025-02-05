#!/bin/bash
set -eu

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  STACK_IDENTIFIER="$1"
  BACKEND_STACK_NAME="${STACK_IDENTIFIER}-async-backend"
else
  BACKEND_STACK_NAME="mob-async-backend" #default stack name in dev
fi

echo "Generating .env file for the $BACKEND_STACK_NAME stack"

PRIVATE_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='PrivateApiUrl'].OutputValue" --output text)
PROXY_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ProxyApiUrl'].OutputValue" --output text)
SESSIONS_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='SessionsApiUrl'].OutputValue" --output text)
STS_MOCK_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='StsMockApiUrl'].OutputValue" --output text)

echo "TEST_ENVIRONMENT=dev" > .env
echo "IS_LOCAL_TEST=true" >> .env
echo "PRIVATE_API_URL=$PRIVATE_API_URL" >> .env
echo "PROXY_API_URL=$PROXY_API_URL" >> .env
echo "SESSIONS_API_URL=$SESSIONS_API_URL" >> .env
echo "STS_MOCK_API_URL=$STS_MOCK_API_URL" >> .env
