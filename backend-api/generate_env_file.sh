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

STS_MOCK_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='StsMockApiUrl'].OutputValue" --output text)
PRIVATE_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='PrivateApiUrl'].OutputValue" --output text)
PROXY_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ProxyApiUrl'].OutputValue" --output text)
EVENTS_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='EventsApiUrl'].OutputValue" --output text)
SESSIONS_API_URL=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='SessionsApiUrl'].OutputValue" --output text)
SESSION_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='SessionsTableName'].OutputValue" --output text)
TXMA_SQS=$(aws cloudformation describe-stacks --stack-name "$BACKEND_STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='TxMASQSQueueUrl'].OutputValue" --output text)

echo "IS_LOCAL_TEST=true" > .env
{
  echo "TEST_ENVIRONMENT=dev"
  echo "STS_MOCK_API_URL=${STS_MOCK_API_URL}"
  echo "PRIVATE_API_URL=${PRIVATE_API_URL}"
  echo "PROXY_API_URL=${PROXY_API_URL}"
  echo "EVENTS_API_URL=${EVENTS_API_URL}"
  echo "SESSIONS_API_URL=${SESSIONS_API_URL}"
  echo "SESSION_TABLE_NAME=${SESSION_TABLE_NAME}"
  echo "TXMA_SQS=${TXMA_SQS}"
} >> .env
