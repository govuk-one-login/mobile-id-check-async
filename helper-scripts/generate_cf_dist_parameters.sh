#!/usr/bin/env bash

# Check if stack name is provided. This is without the -cf-dist suffix
if [ $# -ne 1 ]; then
  echo "Usage: $0 <backend-stack-name>"
  exit 1
fi

stackName=$1

# Check correct AWS account is active
if [ "$(aws sts get-caller-identity --output text --query 'Account')" != "211125300205" ]; then
  echo "This script is attempting to be run in a NON DEV account. Please verify your AWS environment configuration"
  exit 1
fi

originCloakingHeaderManagedSecretRotationMonthWeekDaySchedule="MON#2"
originCloakingHeaderManagedSecretAlarmSNSTopicARN="arn:aws:sns:eu-west-2:211125300205:platform-alarms-sns-warning"
originCloakingHeaderManagedSecretNotificationSNSTopicARN="arn:aws:sns:eu-west-2:211125300205:devplatform-build-notifications-BuildNotificationDetailedTopic-joUMhH5nXhrk"
originCloakingHeaderManagedSecretNotificationSNSTopicKMSKeyARN="arn:aws:kms:eu-west-2:211125300205:key/56de6d5d-c2e7-4c4b-ad77-31f8a51c73ca"

# Retrieve ACM certificate arn
certificateArn=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?(@.DomainName == 'review-b-async.dev.account.gov.uk' && @.Status == 'ISSUED')] | [0].CertificateArn" \
  --output text)

# Generate parameters json
jq --null-input \
  --arg stackName "${stackName}" \
  --arg originCloakingHeader "none" \
  --arg certificateArn "${certificateArn}" \
  --arg originCloakingHeaderManagedSecretRotationMonthWeekDaySchedule "${originCloakingHeaderManagedSecretRotationMonthWeekDaySchedule}" \
  --arg originCloakingHeaderManagedSecretAlarmSNSTopicARN "${originCloakingHeaderManagedSecretAlarmSNSTopicARN}" \
  --arg originCloakingHeaderManagedSecretNotificationSNSTopicARN "${originCloakingHeaderManagedSecretNotificationSNSTopicARN}" \
  --arg originCloakingHeaderManagedSecretNotificationSNSTopicKMSKeyARN "${originCloakingHeaderManagedSecretNotificationSNSTopicKMSKeyARN}" \
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
    "ParameterKey": "OriginCloakingHeaderManagedSecretRotationMonthWeekDaySchedule",
    "ParameterValue": $originCloakingHeaderManagedSecretRotationMonthWeekDaySchedule
  },
  {
    "ParameterKey": "OriginCloakingHeaderManagedSecretAlarmSNSTopicARN",
    "ParameterValue": $originCloakingHeaderManagedSecretAlarmSNSTopicARN
  },
  {
    "ParameterKey": "OriginCloakingHeaderManagedSecretNotificationSNSTopicARN",
    "ParameterValue": $originCloakingHeaderManagedSecretNotificationSNSTopicARN
  },
  {
    "ParameterKey": "OriginCloakingHeaderManagedSecretNotificationSNSTopicKMSKeyARN",
    "ParameterValue": $originCloakingHeaderManagedSecretNotificationSNSTopicKMSKeyARN
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
]' >"parameters-${stackName}-cf-dist.json"
