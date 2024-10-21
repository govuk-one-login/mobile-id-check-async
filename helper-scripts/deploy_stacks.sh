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

# Start deploying backend-api in the background
echo "Building and deploying backend-api stack..."
(
    cd ../backend-api || exit 1
    sam build --cached
    sam deploy \
        --stack-name "$BACKEND_STACK_NAME" \
        --parameter-overrides "$DEV_OVERRIDE_STS_BASE_URL=https://${STS_MOCK_STACK_NAME}.review-b-async.dev.account.gov.uk" \
        --capabilities CAPABILITY_NAMED_IAM \
        --resolve-s3
) > backend_api.log 2>&1 < /dev/null &
# Capture the PID of the background process
backend_api_pid=$!

# Ask the user about deploying STS Mock
deploy_sts_mock=false

while true; do
    read -r -p "Do you want to deploy a custom STS mock? [y/n]: " yn

    case "$yn" in
        [yY] )
            deploy_sts_mock=true
            # Start deploying STS Mock in the background
            echo "Building and deploying STS Mock stack..."
            (
                cd ../sts-mock || exit 1
                sam build
                sam deploy \
                    --stack-name "$STS_MOCK_STACK_NAME" \
                    --parameter-overrides "$DEV_OVERRIDE_ASYNC_BACKEND_BASE_URL=https://sessions-${BACKEND_STACK_NAME}-async-backend.review-b-async.dev.account.gov.uk" \
                    --capabilities CAPABILITY_NAMED_IAM
            ) > sts_mock.log 2>&1 < /dev/null &
            # Capture the PID
            sts_mock_pid=$!
            break
            ;;
        [nN] )
            echo "Skipping STS mock stack deployment"
            break
            ;;
        * )
            echo "Invalid input. Please enter 'y' or 'n'."
            ;;
    esac
done

# Wait for the backend-api deployment to finish
echo "Waiting for backend-api deployment to finish..."
wait $backend_api_pid
backend_api_status=$?

if [ $backend_api_status -ne 0 ]; then
    echo "Backend API deployment failed. Check backend_api.log for details."
    exit 1
fi

# If STS Mock is being deployed, wait for it to finish
if [ "$deploy_sts_mock" = true ]; then
    echo "Waiting for STS mock deployment to finish..."
    wait $sts_mock_pid
    sts_mock_status=$?

    if [ $sts_mock_status -ne 0 ]; then
        echo "STS mock deployment failed. Check sts_mock.log for details."
        exit 1
    fi
fi

# After deploying STS Mock, generate keys
if [ "$deploy_sts_mock" = true ]; then
    while true; do
        read -r -p "Do you want to generate keys for your STS mock stack? [y/n]: " yn

        case "$yn" in
            [yY] )
                echo "Generating keys..."
                cd ../sts-mock/jwks-helper-script || exit 1
                ./publish_keys_to_s3.sh "${STS_MOCK_STACK_NAME}" "dev"
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

echo "Deployment complete!"
