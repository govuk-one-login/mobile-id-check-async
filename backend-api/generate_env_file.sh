#!/bin/bash
set -eu

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  SAM_STACK="$1"
else
  SAM_STACK="mob-async-backend" #default stack name in dev
fi

echo "Generating .env file for the $SAM_STACK stack"

SESSIONS_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='SessionsApiUrl'].OutputValue" --output text)
PROXY_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='ProxyApiUrl'].OutputValue" --output text)
PRIVATE_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='PrivateApiUrl'].OutputValue" --output text)
STS_MOCK_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='StsMockApiUrl'].OutputValue" --output text)

echo "SESSIONS_API_URL=$SESSIONS_API_URL" > .env
echo "PROXY_API_URL=$PROXY_API_URL" >> .env
echo "PRIVATE_API_URL=$PRIVATE_API_URL" >> .env
echo "STS_MOCK_API_URL=$STS_MOCK_API_URL" >> .env
echo "TEST_ENVIRONMENT=dev" >> .env
echo "IS_LOCAL_TEST=true" >> .env
