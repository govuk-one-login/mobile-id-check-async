#!/bin/bash

# Check if stack name is provided
if [ $# -ne 1 ]; then
  echo "Usage: $0 <stack-name>"
  exit 1
fi

# Check correct AWS account is active
if [ "$(aws sts get-caller-identity --output text --query 'Account')" != "211125300205" ]; then
  echo "This script is attempting to be run in a NON DEV account. Please verify your AWS environment configuration"
  exit 1
fi

STACK_IDENTIFIER=$1

# Define stack names
BACKEND_CF_DIST_STACK_NAME="${STACK_IDENTIFIER}-async-backend-cf-dist"
BACKEND_STACK_NAME="${STACK_IDENTIFIER}-async-backend"
TEST_RESOURCES_STACK_NAME="${STACK_IDENTIFIER}-test-resources"

# Define parameter names
DEV_OVERRIDE_BACKEND_STACK_NAME="BackendStackName"
DEV_OVERRIDE_PROXY_BASE_URL="DevOverrideProxyBaseUrl"
DEV_OVERRIDE_SESSIONS_BASE_URL="DevOverrideSessionsBaseUrl"
DEV_OVERRIDE_STS_BASE_URL="DevOverrideStsBaseUrl"
DEV_OVERRIDE_EVENTS_BASE_URL="DevOverrideEventsBaseUrl"
DEV_OVERRIDE_TEST_RESOURCES_BASE_URL="DevOverrideTestResourcesBaseUrl"
DEV_OVERRIDE_READID_PROXY_BASE_URL="DevOverrideReadIdBaseUrl"
DEV_OVERRIDE_READID_MOCK_BASE_URL="DevOverrideReadIdMockBaseUrl"
DEPLOY_ALARMS_IN_DEV="DeployAlarmsInDev"
LAMBDA_DEPLOYMENT_PREFERENCE="LambdaDeploymentPreference"

ASYNC_DOMAIN="review-b-async.dev.account.gov.uk"

DEPLOYMENT_CONFIG_NAME="${BACKEND_STACK_NAME}-Linear20PercentEvery1Minute"

PROXY_URL="https://proxy-${BACKEND_STACK_NAME}.${ASYNC_DOMAIN}"
SESSIONS_URL="https://sessions-${BACKEND_STACK_NAME}.${ASYNC_DOMAIN}"
STS_MOCK_URL="https://sts-${TEST_RESOURCES_STACK_NAME}.${ASYNC_DOMAIN}"
EVENTS_URL="https://events-${TEST_RESOURCES_STACK_NAME}.${ASYNC_DOMAIN}"
TEST_RESOURCES_URL="https://api-${TEST_RESOURCES_STACK_NAME}.${ASYNC_DOMAIN}"

deploy_cf_dist=false
deploy_backend_api_stack=false
enable_alarms=false
enable_canary_deployments=false
deploy_test_resources=false
publish_sts_mock_keys_to_s3=false
overrideReadIdBaseUrl=false
overrideReadIdMockBaseUrl=false


# Ask the user if they want to deploy the backend-cf-dist stack
while true; do
  echo
  echo "Each backend stack requires a cloudfront distribution in front of it. The stack name is of the form ${BACKEND_STACK_NAME}-cf-dist. If it already exists this can be skipped."
  read -r -p "Do you want to deploy a cloudfront distribution stack? [y/N]: " yn

  case "$yn" in
    [yY])
      deploy_cf_dist=true
      break
      ;;
    [nN] | "")
      echo "Skipping cf-dist stack deployment"
      break
      ;;
    *)
      echo "Invalid input. Please enter 'y' or 'n'."
      ;;
  esac
done

# Ask the user about deploying test-resources
while true; do
  echo
  echo "Deploying a test-resources stack is required the first time you deploy a backend-api stack. It's optional for subsequent deployments."
  read -r -p "Do you want to deploy an test-resources stack? [y/N]: " yn

  case $yn in
    [yY])
      deploy_test_resources=true
      break
      ;;
    [nN] | "")
      echo "Skipping test-resources stack deployment"
      break
      ;;
    *)
      echo "Invalid input. Please enter 'y' or 'n'."
      ;;
  esac
done

# After deploying test-resources, ask user if they want to generate keys
if [ $deploy_test_resources == true ]; then
  while true; do
    echo
    echo "Generating and publishing a signing key pair to S3 for the sts-mock is required the first time you deploy the test-resources stack, optional for subsequent deployments."
    read -r -p "Do you want to generate and publish a signing key pair to S3 for your test-resources? [y/N]: " yn

    case "$yn" in
      [yY])
        publish_sts_mock_keys_to_s3=true
        break
        ;;
      [nN] | "")
        echo "Skipping key generation and publishing"
        break
        ;;
      *)
        echo "Invalid input. Please enter 'y' or 'n'."
        ;;
    esac
  done
fi

# Ask the user if they want to deploy backend-api
while true; do
  echo
  read -r -p "Do you want to deploy a backend-api stack? [Y/n]: " yn
  case "$yn" in
  [yY] | "")
    deploy_backend_api_stack=true
    while true; do
      echo
      read -r -p "Do you want to enable alarms for your backend-api stack? [y/N]: " yn
      case "$yn" in
      [yY])
        enable_alarms=true
          while true; do
            echo
            read -r -p "Do you want to enable canary deployments for your backend-api stack? [y/N]: " yn
          case "$yn" in
          [yY])
            enable_canary_deployments=true
            break
            ;;
          [nN] | "")
            break
            ;;
          *)
            echo "Invalid input. Please enter 'y' or 'n'."
            ;;
          esac
        done
        break
        ;;
      [nN] | "")
        break
        ;;
      *)
        echo "Invalid input. Please enter 'y' or 'n'."
        ;;
      esac
    done

    # Ask if the user wants to override the base URL
    while true; do
      echo
      echo "Overriding the ReadId Proxy Url is not needed for the majority of use cases."
      read -r -p "Do you want to override the ReadId Proxy Url? [y/N]: " yn
      case "$yn" in
      [yY])
        overrideReadIdBaseUrl=true
        overrideReadIdMockBaseUrl=true
        read -r -p "Enter your ReadId proxy stack name: " readIdProxyStackName
        read -r -p "Enter your ReadId *mock* stack name: " readIdMockStackName
        break
        ;;
      [nN] | "")
        break
        ;;
      *)
        echo "Invalid input. Please enter 'y' or 'n'."
        ;;
      esac
    done
    break
    ;;
  [nN])
    echo "Skipping backend-api deployment"
    break
    ;;
  *)
    echo "Invalid input. Please enter 'y' or 'n'."
    ;;
  esac
done

if [[ $deploy_cf_dist == true ]]; then
  # Build and deploy backend-cf-dist stack
  echo "Deploying cloudfront stack: $BACKEND_CF_DIST_STACK_NAME"
  echo

  sh ./generate_cf_dist_parameters.sh "${BACKEND_STACK_NAME}"

  TEMPLATE_URL=$(sh get_template_versionid.sh cloudfront-distribution v2.2.0)

  CF_DIST_ARGS="--region eu-west-2"
  CF_DIST_ARGS="${CF_DIST_ARGS} --stack-name ${BACKEND_CF_DIST_STACK_NAME}"
  CF_DIST_ARGS="${CF_DIST_ARGS} --template-url ${TEMPLATE_URL}"
  CF_DIST_ARGS="${CF_DIST_ARGS} --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM CAPABILITY_NAMED_IAM"

  aws cloudformation create-stack $CF_DIST_ARGS --parameters="$(jq -r '. | tojson' "parameters-${BACKEND_CF_DIST_STACK_NAME}.json")" || aws cloudformation update-stack $CF_DIST_ARGS --parameters="$(jq -r '. | tojson' "parameters-${BACKEND_CF_DIST_STACK_NAME}.json")"

  echo "Waiting for stack create/updates to complete"
  aws cloudformation wait stack-create-complete --stack-name "${BACKEND_CF_DIST_STACK_NAME}" || aws cloudformation wait stack-update-complete --stack-name "${BACKEND_CF_DIST_STACK_NAME}"
fi

if [[ $deploy_backend_api_stack == true ]]; then
  parameter_overrides="${DEV_OVERRIDE_STS_BASE_URL}=${STS_MOCK_URL}"
  parameter_overrides+=" ${DEV_OVERRIDE_EVENTS_BASE_URL}=${EVENTS_URL}"
  parameter_overrides+=" ${DEV_OVERRIDE_TEST_RESOURCES_BASE_URL}=${TEST_RESOURCES_URL}"

  if [[ $enable_alarms == true ]]; then
      parameter_overrides+=" $DEPLOY_ALARMS_IN_DEV=true"

      if [[ $enable_canary_deployments == true ]]; then
          parameter_overrides+=" $LAMBDA_DEPLOYMENT_PREFERENCE=${DEPLOYMENT_CONFIG_NAME}"
      fi
  fi

  if [[ $overrideReadIdBaseUrl == true ]]; then
      parameter_overrides+=" $DEV_OVERRIDE_READID_PROXY_BASE_URL=https://readid-proxy-${readIdProxyStackName}.${ASYNC_DOMAIN}/v2"
  fi

  if [[ $overrideReadIdMockBaseUrl == true ]]; then
      parameter_overrides+=" $DEV_OVERRIDE_READID_MOCK_BASE_URL=https://${readIdMockStackName}.${ASYNC_DOMAIN}/v2"
  fi

  # Build and deploy backend-api
  echo "Building and deploying backend-api stack: $BACKEND_STACK_NAME"

  echo
  cd ../backend-api || exit 1
  npm run build:infra
  npm ci
  sam build --cached
  sam deploy \
      --stack-name "$BACKEND_STACK_NAME" \
      --parameter-overrides "$parameter_overrides" \
      --capabilities CAPABILITY_NAMED_IAM \
      --resolve-s3

  aws cloudformation wait stack-create-complete --stack-name "${BACKEND_STACK_NAME}" || aws cloudformation wait stack-update-complete --stack-name "${BACKEND_STACK_NAME}"

  ./generate_env_file.sh "$STACK_IDENTIFIER"
  cd ../helper-scripts || exit
fi

if [[ $deploy_test_resources == true ]]; then
  # Build and deploy test-resources
  echo "Building and deploying test-resources stack: $TEST_RESOURCES_STACK_NAME"
  echo
  cd ../test-resources || exit 1
  npm run build:infra
  npm ci
  sam build
  sam deploy \
    --stack-name "$TEST_RESOURCES_STACK_NAME" \
    --parameter-overrides \
      "${DEV_OVERRIDE_BACKEND_STACK_NAME}=${BACKEND_STACK_NAME} \
      ${DEV_OVERRIDE_PROXY_BASE_URL}=${PROXY_URL} \
      ${DEV_OVERRIDE_SESSIONS_BASE_URL}=${SESSIONS_URL}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --resolve-s3

  aws cloudformation wait stack-create-complete --stack-name "${TEST_RESOURCES_STACK_NAME}" || aws cloudformation wait stack-update-complete --stack-name "${TEST_RESOURCES_STACK_NAME}"

  npm run build:env $STACK_IDENTIFIER
  cd ../helper-scripts || exit
fi

if [[ $publish_sts_mock_keys_to_s3 == true ]]; then
  cd ../test-resources/jwks-helper-script
  ./publish_keys_to_s3.sh "${TEST_RESOURCES_STACK_NAME}" "dev"
  cd ../../helper-scripts
fi

echo
echo "Deployment complete!"
