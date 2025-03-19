#!/bin/bash

# Check if stack name prefix is provided
if [ $# -ne 1 ]; then
  echo "Usage: $0 <stack-name-prefix>"
  exit 1
fi

# Check correct AWS account is active
if [ "$(aws sts get-caller-identity --output text --query 'Account')" != "211125300205" ]; then
  echo "This script is attempting to be run in a NON DEV account. Please verify your AWS environment configuration"
  exit 1
fi

STACK_IDENTIFIER=$1
echo "Stack Prefix: $STACK_IDENTIFIER"

# Define stack names
BACKEND_CF_DIST_STACK_NAME="${STACK_IDENTIFIER}-async-backend-cf-dist"
BACKEND_STACK_NAME="${STACK_IDENTIFIER}-async-backend"
TEST_RESOURCES_STACK_NAME="${STACK_IDENTIFIER}-test-resources"

delete_stack() {
  local stack_name=$1
  echo "======================================================="
  echo "Checking if stack exists: $stack_name"
  
  # Check if stack exists
  if aws cloudformation describe-stacks --stack-name "$stack_name" &>/dev/null; then
    echo "Stack exists: $stack_name"
    
    # Check for S3 buckets in the stack
    echo "Looking for S3 buckets in stack: $stack_name"
    buckets=$(
      aws cloudformation list-stack-resources \
        --stack-name "${stack_name}" \
        --query "StackResourceSummaries[?ResourceType == 'AWS::S3::Bucket'].PhysicalResourceId" \
        --output text
    )
    
    if [ -n "$buckets" ]; then
      echo "Found buckets to empty: ${buckets}"
      
      for bucket in $buckets; do
        echo "Emptying Bucket: ${bucket}"
        
        # Check if bucket exists
        if [ "$(aws s3api list-buckets --query="length(Buckets[?Name=='${bucket}'])")" == "0" ]; then
          echo "Bucket ${bucket} doesn't exist"
          continue
        fi
        
        object_types="Versions DeleteMarkers"
        
        for object_type in ${object_types}; do
          echo "Processing: ${object_type}"
          
          i=0
          while [ "$(count_objects "${bucket}" "${object_type}")" -gt "0" ]; do
            echo "Deleting ${object_type}... $i "
            delete_objects "${bucket}" "${object_type}" $i
            echo "Delete complete $i"
            i=$((i + 1))
          done
        done
        
        echo "Deleting bucket... ${bucket}"
        aws s3api delete-bucket --bucket "${bucket}"
        echo
      done
    else
      echo "No S3 buckets found in stack: $stack_name"
    fi
    
    # Delete the stack
    echo "Deleting stack: $stack_name"
    aws cloudformation delete-stack --stack-name "$stack_name"
    
    echo "Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
    echo "Stack deleted: $stack_name"
  else
    echo "Stack does not exist: $stack_name"
  fi
  echo "======================================================="
  echo
}

# Helper function to count objects
count_objects() {
  local bucket_name=$1
  local version_type=$2
  aws s3api list-object-versions \
    --bucket "${bucket_name}" \
    --query="length(${version_type}[*] || \`[]\`)"
}

# Helper function to list 500 objects
list_500_objects() {
  local bucket_name=$1
  local version_type=$2
  aws s3api list-object-versions \
    --bucket "${bucket_name}" \
    --max-items 500 \
    --query="{Objects: ${version_type}[0:500].{Key:Key,VersionId:VersionId}}"
}

# Helper function to delete objects
delete_objects() {
  local bucket_name=$1
  local version_type=$2
  local iteration=$3
  aws s3api delete-objects \
    --bucket "${bucket_name}" \
    --delete "$(list_500_objects "${bucket_name}" "${version_type}")" 
}

# Start deletion in reverse order of creation
echo "Starting stack deletion process for prefix: $STACK_IDENTIFIER"

# 1. Delete test resources stack first
delete_stack "$TEST_RESOURCES_STACK_NAME"

# 2. Delete backend stack next
delete_stack "$BACKEND_STACK_NAME"

# 3. Delete CloudFront distribution stack last
delete_stack "$BACKEND_CF_DIST_STACK_NAME"

echo "All stacks with prefix '$STACK_IDENTIFIER' have been processed."