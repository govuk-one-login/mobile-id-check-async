#!/bin/bash
set -eu

STACK_NAME_SUFFIX="-test-resources"

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  STACK_NAME="${1}${STACK_NAME_SUFFIX}"
else
  STACK_NAME="mob-async${STACK_NAME_SUFFIX}" # default stack name in dev
fi

echo "Generating .env file for the $STACK_NAME stack"

echo "EVENTS_TABLE_NAME=${STACK_NAME}-events-table-dev" > .env
echo "TXMA_EVENT_TTL_DURATION_IN_SECONDS=3600" >> .env

