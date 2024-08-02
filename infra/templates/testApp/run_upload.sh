#!/usr/bin/env bash

set -e

if [ -d "devplatform-upload-action" ]; then
  echo "Pulling latest upload action"
  cd devplatform-upload-action
  git pull
  cd ../
else
  echo "Cloning the upload action"
  gh repo clone govuk-one-login/devplatform-upload-action
fi

ARTIFACT_BUCKET="$(
  aws cloudformation describe-stacks \
    --stack-name "mob-async-backend-pl" \
    --query "Stacks[0].Outputs[? OutputKey == 'GitHubArtifactSourceBucketName'].OutputValue" \
    --output text
)" && export ARTIFACT_BUCKET

SIGNING_PROFILE="$(
  aws cloudformation describe-stacks \
    --stack-name "devplatform-signer" \
    --query "Stacks[0].Outputs[? OutputKey == 'SigningProfileName' ].OutputValue" \
    --output text
)" && export SIGNING_PROFILE

export TEMPLATE_FILE="template.yaml"
export COMMIT_MESSAGE="Test App Deployment for validating pipeline - stop at Staging"
export GITHUB_ACTOR="dothomson"
export VERSION_NUMBER="v0.0.2"
export GITHUB_REPOSITORY="mobile-id-check-async"
GITHUB_SHA="$(git rev-parse HEAD)" && export GITHUB_SHA

sh ./devplatform-upload-action/scripts/upload.sh
