#!/bin/bash

# Usage: ./deploy_stacks.sh <stack-name>

# Check if stack name is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <stack-name>"
    exit 1
fi

STACK_NAME=$1

# Define stack names
BACKEND_STACK_NAME="${STACK_NAME}-backend"
STS_MOCK_STACK_NAME="${STACK_NAME}-sts-mock"

# Define parameter names
DEV_OVERRIDE_STS_BASE_URL="DevOverrideStsBaseUrl"
DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL="DevOverrideAsyncBackendBaseUrl"

# Deploy backend-api
echo "Building and deploying backend-api stack..."
cd ../backend-api || exit 1
sam build --cached
sam deploy \
    --stack-name "$BACKEND_STACK_NAME" \
    --parameter-overrides "$DEV_OVERRIDE_STS_BASE_URL=https://${STS_MOCK_STACK_NAME}.review-b-async.dev.account.gov.uk" \
    --capabilities CAPABILITY_NAMED_IAM \
    --resolve-s3

# Deploy STS Mock
while true; do
    read -r -p "Do you want deploy a custom STS mock? [y/n]: " yn

    case "$yn" in
        [yY] )
            echo "Building and deploying STS Mock stack..."
            cd ../sts-mock || exit 1
            sam build
            sam deploy \
                --stack-name "$STS_MOCK_STACK_NAME" \
                --parameter-overrides "$DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL=https://sessions-${BACKEND_STACK_NAME}-async-backend.review-b-async.${Environment}.account.gov.uk" \
                --capabilities CAPABILITY_NAMED_IAM
            break
            ;;
        [nN] )
            echo "Skipping STS mock stack deployment"
            break
            ;;
        * )
            echo "Invalid input. Please enter 'y' or 'n'.\n"
            ;;
    esac
done

# After deploying STS Mock, generate keys
while true; do
    read -r -p "Do you want to generate keys for your STS mock stack? [y/n]: " yn

    case "$yn" in
        [yY] )
            echo "\nGenerating keys"
            cd ../sts-mock/jwks-helper-script || exit 1
            ./publish_keys_to_s3.sh "${STS_MOCK_STACK_NAME}" "dev"
            break
            ;;
        [nN] )
            echo "\nSkipping key generation"
            break
            ;;
        * )
            echo "\nInvalid input. Please enter 'y' or 'n'.\n"
            ;;
    esac
done

echo "\nDeployment complete!"
