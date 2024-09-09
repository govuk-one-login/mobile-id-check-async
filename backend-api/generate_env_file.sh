#!/bin/bash
set -eu

ENV="dev"

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  SAM_STACK="$1"
else
  SAM_STACK="backend-api" #default stack name in dev
fi

echo "Generating .env file for the $SAM_STACK stack"

SELF=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='PublicAPIGWBaseURL'].OutputValue" --output text)

echo "SELF_PUBLIC=$SELF" >> .env
echo "PROXY_API_URL=https://proxy-$SAM_STACK.review-b-async.$ENV.account.gov.uk" >> .env