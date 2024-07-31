#!/usr/bin/env bash

# ABOUT: This script will find the latest s3 version id for each template file. It will also
# download that file locally. Requires AWS credentials which have access to the provided bucket. The
# bucket can be overridden exporting TEMPLATE_STORAGE_BUCKET as an environment variable.
# USAGE: sh get-latest-versions.sh "${TEMPLATE_NAME}"
# EXAMPLE: sh get-latest-versions.sh "vpc"

set -e

TEMPLATE_STORAGE_BUCKET=${TEMPLATE_STORAGE_BUCKET:-}

if [ -z "$TEMPLATE_STORAGE_BUCKET" ]; then
  echo "Retrieving TEMPLATE_STORAGE_BUCKET from aws ssm"
  TEMPLATE_STORAGE_BUCKET=$(aws ssm get-parameter --name /devplatform/template-storage-bucket --query 'Parameter.Value' --output text)
fi

TEMPLATE_NAME="${1}"

if [ -z "${TEMPLATE_NAME}" ]; then
  echo "Please provide a template name"
  exit 1
fi

LATEST_VERSION_ID=$(
  aws s3api list-object-versions \
    --bucket "${TEMPLATE_STORAGE_BUCKET}" \
    --prefix "${TEMPLATE_NAME}/template.yaml" |
    jq -r '.Versions
      | sort_by(.LastModified)
      | last
      | .VersionId'
)

echo "Latest version?"
aws s3api list-object-versions \
  --bucket "${TEMPLATE_STORAGE_BUCKET}" \
  --prefix "${TEMPLATE_NAME}/template.yaml" | jq '.Versions[0]'
echo

VERSION=$(
  aws s3api head-object --bucket "${TEMPLATE_STORAGE_BUCKET}" --key "${TEMPLATE_NAME}/template.yaml" --version-id "${LATEST_VERSION_ID}" | jq -r '.Metadata.version'
)

echo "Head object"
aws s3api head-object --bucket "${TEMPLATE_STORAGE_BUCKET}" --key "${TEMPLATE_NAME}/template.yaml" --version-id "${LATEST_VERSION_ID}" | jq .
echo

TEMPLATE_URL="https://${TEMPLATE_STORAGE_BUCKET}.s3.amazonaws.com/${TEMPLATE_NAME}/template.yaml?versionId=${LATEST_VERSION_ID}"

echo "Bucket:    ${TEMPLATE_STORAGE_BUCKET}"
echo "Key:       ${TEMPLATE_NAME}/template.yaml"
echo "VersionId: ${LATEST_VERSION_ID}"
echo "Version:   ${VERSION}"
echo "Url:       ${TEMPLATE_URL}"
echo
echo "Saving template to ./templates/${TEMPLATE_NAME}-${VERSION}.yaml"
echo

mkdir -pv "templates"

curl "${TEMPLATE_URL}" \
  --user "$(aws configure export-credentials | jq -r .AccessKeyId)":"$(aws configure export-credentials | jq -r .SecretAccessKey)" \
  --header "x-amz-security-token: $(aws configure export-credentials | jq -r .SessionToken)" \
  --aws-sigv4 "aws:amz:eu-west-2:s3" \
  --output "templates/${TEMPLATE_NAME}-${VERSION}.yaml"
