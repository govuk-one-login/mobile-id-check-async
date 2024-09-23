#!/bin/bash
set -eu

ENV="dev"

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  SAM_STACK="$1"
else
  SAM_STACK="mob-async-backend" #default stack name in dev
fi

echo "Generating .env file for the $SAM_STACK stack"

SESSIONS_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='PublicApiUrl'].OutputValue" --output text)
PROXY_API_URL=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='ProxyApiUrl'].OutputValue" --output text)

echo "SESSIONS_API_URL=$SESSIONS_API_URL" > .env
echo "PROXY_API_URL=$PROXY_API_URL" >> .env