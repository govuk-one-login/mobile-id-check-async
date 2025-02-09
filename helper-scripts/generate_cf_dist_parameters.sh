#!/usr/bin/env bash

# Check if stack name is provided. This is without the -cf-dist suffix
if [ $# -ne 1 ]; then
  echo "Usage: $0 <backend-stack-name>"
  exit 1
fi

  mkdir -p "deployResponses"

stackName=$1

# Check correct AWS account is active
if [ "$(aws sts get-caller-identity --output text --query 'Account')" != "211125300205" ]; then
  echo "This script is attempting to be run in a NON DEV account. Please verify your AWS environment configuration"
  exit 1
fi

# Check if cloudfront distribution stack already exists
originCloakingHeaderSecretArn=$(aws cloudformation describe-stacks \
  --stack-name "${stackName}-cf-dist" \
  --query "Stacks[0].Outputs[?(@.OutputKey == 'CloakingSecretArn')].OutputValue" \
  --output text 2>/dev/null)
originCloakingHeaderSecretArnResult=$?

# Either retrieve current originCloakingHeader or generate a new one
if [ "${originCloakingHeaderSecretArnResult}" != "0" ]; then
  originCloakingHeader="$(
    LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 64
    echo | base64
  )"
else
  originCloakingHeader=$(aws secretsmanager get-secret-value \
    --secret-id "${originCloakingHeaderSecretArn}" \
    --query "SecretString" \
    --output text)
fi

# Retrieve ACM certificate arn
certificateArn=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?(@.DomainName == 'review-b-async.dev.account.gov.uk' && @.Status == 'ISSUED')] | [0].CertificateArn" \
  --output text)

# Generate parameters json
jq --null-input \
  --arg stackName "${stackName}" \
  --arg originCloakingHeader "${originCloakingHeader}" \
  --arg certificateArn "${certificateArn}" \
  '[
  {
    "ParameterKey": "DistributionAlias",
    "ParameterValue": ("sessions-" + $stackName + ".review-b-async.dev.account.gov.uk")
  },
  {
    "ParameterKey": "CloudFrontCertArn",
    "ParameterValue": $certificateArn
  },
  {
    "ParameterKey": "FraudHeaderEnabled",
    "ParameterValue": "true"
  },
  {
    "ParameterKey": "OriginCloakingHeader",
    "ParameterValue": $originCloakingHeader
  },
  {
    "ParameterKey": "PreviousOriginCloakingHeader",
    "ParameterValue": $originCloakingHeader
  },
  {
    "ParameterKey": "StandardLoggingEnabled",
    "ParameterValue": "false"
  },
  {
    "ParameterKey": "LogDestination",
    "ParameterValue": "none"
  }
]' >"./deployResponses/parameters-${stackName}-cf-dist.json"
