#!/bin/bash
set -eu

ENV="dev"
TEST_RESOURCES="test-resources"

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  STACK_IDENTIFIER="$1"
  TEST_RESOURCES_STACK_NAME="${STACK_IDENTIFIER}-${TEST_RESOURCES}"
else
  # default stack name in dev
  TEST_RESOURCES_STACK_NAME=$TEST_RESOURCES
fi

echo "Generating .env file for the $TEST_RESOURCES_STACK_NAME stack"

STS_MOCK_API_URL=$(aws cloudformation describe-stacks --stack-name "$TEST_RESOURCES_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='StsMockApiUrl'].OutputValue" --output text)
PROXY_API_URL=$(aws cloudformation describe-stacks --stack-name "$TEST_RESOURCES_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ProxyApiUrl'].OutputValue" --output text)
SESSIONS_API_URL=$(aws cloudformation describe-stacks --stack-name "$TEST_RESOURCES_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='SessionsApiUrl'].OutputValue" --output text)
EVENTS_API_URL=$(aws cloudformation describe-stacks --stack-name "$TEST_RESOURCES_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='EventsApiUrl'].OutputValue" --output text)

echo "TEST_ENVIRONMENT=dev" > .env
echo "STS_MOCK_API_URL=$STS_MOCK_API_URL" >> .env
echo "PROXY_API_URL=$PROXY_API_URL" >> .env
echo "SESSIONS_API_URL=$SESSIONS_API_URL" >> .env
echo "EVENTS_API_URL=$EVENTS_API_URL" >> .env
