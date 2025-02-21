#!/bin/bash

set -u

STACK_NAME=${1}
TEMPLATE_VERSION=${2}

# Dev Platform's template storage bucket
TEMPLATE_BUCKET=template-storage-templatebucket-1upzyw6v9cs42

for versionId in $(aws s3api list-object-versions --bucket ${TEMPLATE_BUCKET} --prefix ${STACK_NAME}/template.yaml \
    | jq .Versions[] | grep VersionId | awk {' print $2 '} | sed 's/"//g' | sed 's/,//g'); do

echo >&2 "looking for $TEMPLATE_VERSION in versionId $versionId"
FOUND_VERSION=$(aws s3api head-object --bucket ${TEMPLATE_BUCKET} --key ${STACK_NAME}/template.yaml \
    --version-id $versionId --query 'Metadata.version' --output text)

if [[ $TEMPLATE_VERSION == $FOUND_VERSION ]]; then
    echo >&2 "Template match found."
    break
fi

echo >&2 "No match, keep trying..."
done

if [[ $TEMPLATE_VERSION != $FOUND_VERSION ]]; then
    return 1
fi

echo "https://${TEMPLATE_BUCKET}.s3.amazonaws.com/${STACK_NAME}/template.yaml?versionId=$versionId"