#!/bin/bash
set -eu

stack_name=${1:-mob-async-backend}

echo "Running test against ${stack_name}"

rm -rf docker-vars.env

export AWS_DEFAULT_REGION="eu-west-2"
TEST_REPORT_DIR="results"
ENVIRONMENT="dev"

aws cloudformation describe-stacks \
  --stack-name "$stack_name" \
  --query 'Stacks[0].Outputs[].{key: OutputKey, value: OutputValue}' \
  --output text >cf-output.txt

eval $(awk '{ printf("export CFN_%s=\"%s\"\n", $1, $2) }' cf-output.txt)
awk '{ printf("CFN_%s=\"%s\"\n", $1, $2) }' cf-output.txt >>docker-vars.env

{
  echo TEST_REPORT_DIR="$TEST_REPORT_DIR"
  echo TEST_REPORT_ABSOLUTE_DIR="/results"
  echo TEST_ENVIRONMENT="$ENVIRONMENT"
  echo SAM_STACK_NAME="$stack_name"
} >>docker-vars.env

aws configure export-credentials --format env-no-export >> docker-vars.env

docker build --tag testcontainer .

docker run --rm --interactive --tty \
  --user root \
  --env-file docker-vars.env \
  --volume "$(pwd):/results" \
  testcontainer
