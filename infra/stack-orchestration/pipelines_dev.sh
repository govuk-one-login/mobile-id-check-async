#!/bin/bash

set -u

# Input parameters
AWS_ACCOUNT=di-mobile-id-check-async-dev
PIPELINE_VERSION=v2.52.5
export AWS_ACCOUNT=$AWS_ACCOUNT
export PIPELINE_VERSION=$PIPELINE_VERSION

./provisioner.sh $AWS_ACCOUNT base-image-pipeline sam-deploy-pipeline $PIPELINE_VERSION || exit 1
./provisioner.sh $AWS_ACCOUNT async-synthetics-pipeline sam-deploy-pipeline $PIPELINE_VERSION || exit 1
./provisioner.sh $AWS_ACCOUNT async-test-client-pipeline sam-deploy-pipeline $PIPELINE_VERSION || exit 1
./provisioner.sh $AWS_ACCOUNT async-mock-readid-pipeline sam-deploy-pipeline $PIPELINE_VERSION || exit 1
./provisioner.sh $AWS_ACCOUNT pipeline-platform-security sam-deploy-pipeline $PIPELINE_VERSION || exit 1
./provisioner.sh $AWS_ACCOUNT pipeline-platform-readid sam-deploy-pipeline $PIPELINE_VERSION || exit 1
# ./provisioner.sh $AWS_ACCOUNT frontend-pipeline sam-deploy-pipeline $PIPELINE_VERSION || exit 1
./provisioner.sh $AWS_ACCOUNT backend-api-pipeline sam-deploy-pipeline $PIPELINE_VERSION || exit 1