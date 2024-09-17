#!/bin/bash

PRIVATE_KEY_FILE_NAME="private-key.json";
JWKS_FILE_NAME="jwks.json";

aws sts get-caller-identity >/dev/null 2>&1
if [ $? -gt 0 ]; then
  echo "Not logged in to an AWS Account."
  exit 1
fi

if [ $# != 2 ]; then
  echo "Incorrect number of parameters supplied. Supply the stack name." 1>&2
  exit 1
fi

echo "Generating keys"
npm install
node jwksHelperScript.mjs $PRIVATE_KEY_FILE_NAME $JWKS_FILE_NAME

STACK_NAME="$1"
ENVIRONMENT="$2"
BUCKET_NAME="$STACK_NAME"-jwks-"$ENVIRONMENT"

echo "Uploading keys"
aws s3 cp $PRIVATE_KEY_FILE_NAME s3://"$BUCKET_NAME"/
aws s3 cp $JWKS_FILE_NAME s3://"$BUCKET_NAME"/.well-known/
