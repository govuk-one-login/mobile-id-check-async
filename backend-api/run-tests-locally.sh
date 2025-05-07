#!/bin/bash
set -eu

BACKEND_STACK_NAME="${1:-mob}-async-backend"

echo "Running test against ${BACKEND_STACK_NAME}"

rm -rf docker-vars.env

export AWS_DEFAULT_REGION="eu-west-2"
TEST_REPORT_DIR="results"
ENVIRONMENT="dev"
IS_LOCAL_TEST="true"

aws cloudformation describe-stacks \
  --stack-name "$BACKEND_STACK_NAME" \
  --query 'Stacks[0].Outputs[].{key: OutputKey, value: OutputValue}' \
  --output text > cf-output.txt

eval $(awk '{ printf("export CFN_%s=\"%s\"\n", $1, $2) }' cf-output.txt)
awk '{ printf("CFN_%s=\"%s\"\n", $1, $2) }' cf-output.txt >> docker-vars.env

{
  echo TEST_REPORT_DIR="$TEST_REPORT_DIR"
  echo TEST_REPORT_ABSOLUTE_DIR="/results"
  echo TEST_ENVIRONMENT="$ENVIRONMENT"
  echo SAM_STACK_NAME="$BACKEND_STACK_NAME"
  echo IS_LOCAL_TEST="$IS_LOCAL_TEST"
} >> docker-vars.env

aws configure export-credentials --format env-no-export >> docker-vars.env

docker buildx build --tag testcontainer --secret id=NPM_TOKEN,env=NPM_TOKEN .

docker run --rm --interactive --tty \
  --user root \
  --env-file docker-vars.env \
  --env NPM_TOKEN=$NPM_TOKEN \
  --volume "$(pwd):/results" \
  testcontainer
