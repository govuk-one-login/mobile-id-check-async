#!/bin/bash
set -eu

if [ $# -ge 1 ] && [ -n "$1" ] ; then
  SAM_STACK="$1"
else
  SAM_STACK="mob-async-backend" #default stack name in dev
fi

echo "Generating .env file for the $SAM_STACK stack"

SELF=$(aws cloudformation describe-stacks --stack-name "$SAM_STACK" --query "Stacks[0].Outputs[?OutputKey=='PublicAPIGWBaseURL'].OutputValue" --output text)

echo "SELF_PUBLIC=$SELF" > .env