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

STACK_NAME=$1

# Define stack names
BACKEND_STACK_NAME="${STACK_NAME}-async-backend"
STS_MOCK_STACK_NAME="${STACK_NAME}-sts-mock"

# Define parameter names
DEV_OVERRIDE_STS_BASE_URL="DevOverrideStsBaseUrl"
DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL="DevOverrideAsyncBackendBaseUrl"

# Ask the user about deploying sts-mock
deploy_sts_mock=false
while true; do
    echo
    read -r -p "Do you want to deploy a custom sts-mock stack? [y/n]: " yn

    case "$yn" in
        [yY] )
            deploy_sts_mock=true
            # Build and deploy sts-mock
            echo "Building and deploying sts-mock stack: $STS_MOCK_STACK_NAME"
            echo
            cd ../sts-mock || exit 1
            sam build
            sam deploy \
                --stack-name "$STS_MOCK_STACK_NAME" \
                --parameter-overrides "$DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL=https://sessions-${BACKEND_STACK_NAME}.review-b-async.dev.account.gov.uk" \
                --capabilities CAPABILITY_NAMED_IAM \
                --resolve-s3
            break
            ;;
        [nN] )
            echo "Skipping sts-mock stack deployment"
            break
            ;;
        * )
            echo "Invalid input. Please enter 'y' or 'n'."
            ;;
    esac
done

# After deploying sts-mock, ask user if they want to generate keys
if [ "$deploy_sts_mock" = true ]; then
    while true; do
        echo
        read -r -p "Do you want to generate keys for your sts-mock stack? [y/n]: " yn

        case "$yn" in
            [yY] )
                cd ../sts-mock/jwks-helper-script
                ./publish_keys_to_s3.sh "${STS_MOCK_STACK_NAME}" "dev"
                cd ..
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

# Ask the user if they want to deploy backend-api
while true; do
    echo
    read -r -p "Do you want to deploy a custom backend-api stack? [y/n]: " yn

    case "$yn" in
        [yY] )
            # Build and deploy backend-api
            echo "Building and deploying custom backend-api stack: $BACKEND_STACK_NAME"
            echo
            cd ../backend-api || exit 1
            sam build --cached
            sam deploy \
                --stack-name "$BACKEND_STACK_NAME" \
                --parameter-overrides "$DEV_OVERRIDE_STS_BASE_URL=https://${STS_MOCK_STACK_NAME}.review-b-async.dev.account.gov.uk" \
                --capabilities CAPABILITY_NAMED_IAM \
                --resolve-s3
            ./generate_env_file.sh "${BACKEND_STACK_NAME}"
            break
            ;;
        [nN] )
            echo "Skipping backend-api deployment"
            break
            ;;
        * )
            echo "Invalid input. Please enter 'y' or 'n'."
            ;;
    esac
done

echo
echo "Stack deployment complete!"
