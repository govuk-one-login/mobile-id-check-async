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

# Ask the user if they want to build and deploy the custom backend-api
echo
read -r -p "You are about to deploy a custom Backend API, do you wish to continue? [y]: " yn

if [ "$yn" != "y" ] && [ "$yn" != "Y" ]; then
    echo "Aborting."
    exit 1
fi

STACK_NAME=$1

# Define stack names
BACKEND_STACK_NAME="${STACK_NAME}-backend"
STS_MOCK_STACK_NAME="${STACK_NAME}-sts-mock"

# Define parameter names
DEV_OVERRIDE_STS_BASE_URL="DevOverrideStsBaseUrl"
DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL="DevOverrideAsyncBackendBaseUrl"

# Start deploying backend-api
echo "Building and deploying custom Backend API stack: $BACKEND_STACK_NAME"
(
    cd ../backend-api || exit 1
    sam build --cached
    sam deploy \
        --stack-name "$BACKEND_STACK_NAME" \
        --parameter-overrides "$DEV_OVERRIDE_STS_BASE_URL=https://${STS_MOCK_STACK_NAME}.review-b-async.dev.account.gov.uk" \
        --capabilities CAPABILITY_NAMED_IAM \
        --resolve-s3
)
backend_api_status=$?

if [ $backend_api_status -ne 0 ]; then
    echo "Backend API deployment failed."
    exit 1
else
    echo "Backend API deployment completed successfully."
fi

# Ask the user about deploying sts-mock
deploy_sts_mock=false

while true; do
    echo
    read -r -p "Do you want to deploy a custom STS Mock stack? [y/n]: " yn

    case "$yn" in
        [yY] )
            deploy_sts_mock=true
            # Start deploying sts-mock
            echo "Building and deploying STS Mock stack: $STS_MOCK_STACK_NAME"
            (
                cd ../sts-mock || exit 1
                sam build
                sam deploy \
                    --stack-name "$STS_MOCK_STACK_NAME" \
                    --parameter-overrides "$DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL=https://sessions-${BACKEND_STACK_NAME}-async-backend.review-b-async.dev.account.gov.uk" \
                    --capabilities CAPABILITY_NAMED_IAM \
                    --resolve-s3
            )
            sts_mock_status=$?
            if [ $sts_mock_status -ne 0 ]; then
                echo "STS Mock deployment failed."
                exit 1
            else
                echo "STS Mock deployment completed successfully."
            fi
            break
            ;;
        [nN] )
            echo "Skipping STS Mock stack deployment"
            break
            ;;
        * )
            echo "Invalid input. Please enter 'y' or 'n'."
            ;;
    esac
done

# After deploying sts-mock, generate keys
if [ "$deploy_sts_mock" = true ]; then
    while true; do
        echo
        read -r -p "Do you want to generate keys for your STS Mock stack? [y/n]: " yn

        case "$yn" in
            [yY] )
                echo "Generating keys..."
                (
                    set -e
                    cd ../sts-mock/jwks-helper-script
                    ./publish_keys_to_s3.sh "${STS_MOCK_STACK_NAME}" "dev"
                )
                keygen_status=$?
                if [ $keygen_status -ne 0 ]; then
                    echo "Key generation failed."
                    exit 1
                else
                    echo "Key generation completed successfully."
                fi
                break
                ;;
            [nN] )
                echo "Skipping key generation."
                break
                ;;
            * )
                echo "Invalid input. Please enter 'y' or 'n'."
                ;;
        esac
    done
fi

echo
echo "Stack deployment complete!"
