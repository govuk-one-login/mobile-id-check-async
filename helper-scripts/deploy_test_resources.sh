#!/bin/bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 <stack-name>"
  exit 1
fi

if [ "$(aws sts get-caller-identity --output text --query 'Account')" != "211125300205" ]; then
  echo "This script is attempting to be run in a NON DEV account. Please verify your AWS environment configuration"
  exit 1
fi

STACK_IDENTIFIER=$1

TEST_RESOURCES_STACK_NAME="${STACK_IDENTIFIER}-test-resources"
BACKEND_STACK_NAME="${STACK_IDENTIFIER}-async-backend"
# STS_MOCK_STACK_NAME="${STACK_NAME}-sts-mock"

# DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL="DevOverrideAsyncBackendBaseUrl"
DEV_OVERRIDE_BACKEND_STACK_NAME="BackendStackName"
DEV_OVERRIDE_STS_MOCK_BASE_URL="DevOverrideStsMockBaseUrl"
DEV_OVERRIDE_PROXY_BASE_URL="DevOverrideProxyBaseUrl"
DEV_OVERRIDE_SESSIONS_BASE_URL="DevOverrideSessionsBaseUrl"

STS_MOCK_URL="https://${STACK_IDENTIFIER}-sts-mock.review-b-async.dev.account.gov.uk"
PROXY_URL="https://proxy-${BACKEND_STACK_NAME}.review-b-async.dev.account.gov.uk"
SESSIONS_URL="https://sessions-${BACKEND_STACK_NAME}.review-b-async.dev.account.gov.uk"

deploy_sts_mock=false
publish_keys_to_s3=false

# Ask the user about deploying sts-mock
while true; do
  echo
  echo "Deploying an sts-mock stack is required the first time you deploy a backend-api stack. It's optional for subsequent deployments."
  read -r -p "Do you want to deploy an test-resources stack? [Y/n]: " yn

  case $yn in
    [yY] | "")
      deploy_sts_mock=true
      break
      ;;
    [nN])
      echo "Skipping sts-mock stack deployment"
      break
      ;;
    *)
      echo "Invalid input. Please enter 'y' or 'n'."
      ;;
  esac
done

# After deploying sts-mock, ask user if they want to generate keys
if [ $deploy_sts_mock == true ]; then
  while true; do
    echo
    echo "Generating and publishing a signing key pair to S3 is required the first time you deploy an sts-mock, optional for subsequent deployments."
    read -r -p "Do you want to generate and publish a signing key pair to S3 for your sts-mock? [Y/n]: " yn

    case "$yn" in
      [yY] | "")
        publish_keys_to_s3=true
        break
        ;;
      [nN])
        echo "Skipping key generation and publishing"
        break
        ;;
      *)
        echo "Invalid input. Please enter 'y' or 'n'."
        ;;
    esac
  done
fi

if [[ $deploy_sts_mock == true ]]; then
  # Build and deploy sts-mock
  echo "Building and deploying sts-mock stack: $TEST_RESOURCES_STACK_NAME"
  echo
  cd ../sts-mock || exit 1
  npm run build:infra
  npm ci
  sam build --cached
  sam deploy \
    --stack-name "$TEST_RESOURCES_STACK_NAME" \
    --parameter-overrides \
      "$DEV_OVERRIDE_BACKEND_STACK_NAME=${BACKEND_STACK_NAME} \
      $DEV_OVERRIDE_STS_MOCK_BASE_URL=${STS_MOCK_URL} \
      $DEV_OVERRIDE_PROXY_BASE_URL=${PROXY_URL} \
      $DEV_OVERRIDE_SESSIONS_BASE_URL=${SESSIONS_URL}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --resolve-s3

  echo "Waiting for stack create/updates to complete"
  aws cloudformation wait stack-create-complete --stack-name "${TEST_RESOURCES_STACK_NAME}" || aws cloudformation wait stack-update-complete --stack-name "${TEST_RESOURCES_STACK_NAME}"

  cd ../helper-scripts
fi


if [[ $publish_keys_to_s3 == true ]]; then
  cd ../sts-mock/jwks-helper-script
  ./publish_keys_to_s3.sh "${TEST_RESOURCES_STACK_NAME}" "dev"
  cd ../../helper-scripts
fi

# while true; do
#   echo
#   read -r -p "Do you want to deploy a test-resources stack? [Y/n]: " yn

#   case "$yn" in
#     [yY] | "")
#       echo "Building and deploying test-resources stack: $TEST_RESOURCES_STACK_NAME"
#       echo
#       cd ../test-resources
#       npm i
#       sam build --cached
#       if [ $? -ge 1 ]; then
#         echo "Build failed"
#         exit 1
#       else
#         sam deploy \
#           --stack-name "$TEST_RESOURCES_STACK_NAME" \
#           --parameter-overrides \
#             "BackendStackName=${BACKEND_STACK_NAME} \
#             DevOverrideProxyBaseUrl=${PROXY_URL} \
#             DevOverrideStsMockBaseUrl=${STS_MOCK_URL} \
#             DevOverrideSessionsBaseUrl=${SESSIONS_URL}" \
#           --capabilities CAPABILITY_NAMED_IAM \
#           --resolve-s3
#       fi

#       break
#       ;;
#     [nN])
#       echo "Skipping test-resources deployment"
#       break
#       ;;
#     *)
#       echo "Invalid input. Please enter 'y' or 'n'."
#       ;;
#   esac
# done
