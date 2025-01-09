#!/bin/bash
set -eu

STACK_NAME_SUFFIX="-test-resources"

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  STACK_NAME="${1}${STACK_NAME_SUFFIX}"
else
  STACK_NAME="mob-async-backend${STACK_NAME_SUFFIX}" # default stack name in dev
fi

echo "Generating .env file for the $STACK_NAME stack"

EVENTS_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='EvnetsTableName'].OutputValue" --output text)

echo "EVENTS_TABLE_NAME=$EVENTS_TABLE_NAME" > .env
echo "TXMA_EVENT_TTL_DURATION_IN_SECONDS=3600" >> .env

