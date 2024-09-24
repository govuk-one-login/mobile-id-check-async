#!/bin/bash
set -eu

ENV="dev"

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  SAM_STACK="$1"
else
  SAM_STACK="sts-mock" #default stack name in dev
fi

echo "Generating .env file for the $SAM_STACK stack"

STS_MOCK_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='StsMockApiUrl'].OutputValue" --output text)

echo "STS_MOCK_API_URL=$STS_MOCK_API_URL" > .env