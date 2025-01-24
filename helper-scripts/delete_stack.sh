#!/usr/bin/env bash

if [ "$(aws sts get-caller-identity --output text --query 'Account')" != "211125300205" ]; then
  echo "This script is attempting to be run in a NON DEV account. Please verify your AWS environment configuration"
  exit 1
fi

# Check if stack name is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <stack-name>"
    exit 1
fi

STACK_NAME=$1
echo "Stack Name: $STACK_NAME"

buckets=$(
  aws cloudformation list-stack-resources \
    --stack-name "${STACK_NAME}" \
    --query "StackResourceSummaries[?ResourceType == 'AWS::S3::Bucket'].PhysicalResourceId" \
    --output text
)

echo "Found buckets: ${buckets}"

# Each function takes the arguments: BUCKET_NAME, VERSION TYPE (Valid values: {Versions, DeleteMarkers})
count() {
  aws s3api list-object-versions \
    --bucket "${1}" \
    --query="length(${2}[*] || \`[]\`)"
}

list_500() {
  aws s3api list-object-versions \
    --bucket "${1}" \
    --max-items 500 \
    --query="{Objects: ${2}[0:500].{Key:Key,VersionId:VersionId}}"
}

delete() {
  aws s3api delete-objects \
    --bucket "${1}" \
    --delete "$(list_500 "${1}" "${2}")" \
    >"./delete_response_${1}_${2}_${i}.json"
}

for bucket in $buckets; do

  if [ "$(aws s3api list-buckets --query="length(Buckets[?Name=='${bucket}'])")" == "0" ]; then
    echo "Bucket ${bucket} doesn't exist"
    continue
  fi

  echo "Emptying Bucket: ${bucket}"

  object_types="Versions DeleteMarkers"

  for object_type in ${object_types}; do
    echo "Processing: ${object_type}"
    echo "${object_type} Count: $(count "${bucket}" "${object_type}")"

    i=0
    while [ "$(count "${bucket}" "${object_type}")" -gt "0" ]; do

      echo "Deleting ${object_type}... $i "
      delete "${bucket}" "${object_type}"

      echo "delete complete $i"
      echo

      i=$((i + 1))
    done
  done

  echo "Deleting bucket... ${bucket}"
  aws s3api delete-bucket --bucket "${bucket}"

  echo
  echo
done

sam delete --stack-name "$STACK_NAME" --no-prompts