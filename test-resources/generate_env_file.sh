#!/bin/bash
set -eu

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  SAM_STACK="$1"
else
  SAM_STACK="test-resources" #default stack name in dev
fi

echo "Generating .env file for the $SAM_STACK stack"

EVENTS_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='EventsApiUrl'].OutputValue" --output text)
PROXY_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='ProxyApiUrl'].OutputValue" --output text)
SESSIONS_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='SessionsApiUrl'].OutputValue" --output text)
STS_MOCK_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='StsMockApiUrl'].OutputValue" --output text)

echo "EVENTS_API_URL=$EVENTS_API_URL" > .env
echo "PROXY_API_URL=$PROXY_API_URL" >> .env
echo "SESSIONS_API_URL=$SESSIONS_API_URL" >> .env
echo "STS_MOCK_API_URL=$STS_MOCK_API_URL" >> .env
echo "TEST_ENVIRONMENT=dev" >> .env
