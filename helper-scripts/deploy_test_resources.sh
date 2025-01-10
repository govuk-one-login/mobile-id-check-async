#!/bin/bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 <stack-name> <optional-custom-backend-stack-name>"
  exit 1
fi

if [ "$(aws sts get-caller-identity --output text --query 'Account')" != "211125300205" ]; then
  echo "This script is attempting to be run in a NON DEV account. Please verify your AWS environment configuration"
  exit 1
fi

STACK_NAME=$1

TEST_RESOURCES_STACK_NAME="${STACK_NAME}-test-resources"
BACKEND_STACK_NAME=${2:-"mob-async-backend"}

while true; do
  echo
  read -r -p "Do you want to deploy a test-resources stack? [Y/n]: " yn

  case "$yn" in
    [yY] | "")
      echo "Building and deploying test-resources stack: $TEST_RESOURCES_STACK_NAME"
      echo
      cd ../test-resources
      npm i
      sam build --cached
      if [ $? -ge 1 ]; then
        echo "Build failed"
        exit 1
      else
        sam deploy \
          --stack-name "$TEST_RESOURCES_STACK_NAME" \
          --parameter-overrides "BackendApi=${BACKEND_STACK_NAME}" \
          --capabilities CAPABILITY_NAMED_IAM \
          --resolve-s3
      fi

      break
      ;;
    [nN])
      echo "Skipping test-resources deployment"
      break
      ;;
    *)
      echo "Invalid input. Please enter 'y' or 'n'."
      ;;
  esac
done
