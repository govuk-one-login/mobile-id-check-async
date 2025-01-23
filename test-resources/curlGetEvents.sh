#!/bin/bash

# Facilitates testing the API until Axios test suite is available
# Paste the API execute url (including state) from the AWS Console -> Stages

set -e

api_execute_url=<PASTE_HERE>

aws_credentials=$( aws configure export-credentials )
access_key_id=$( echo "$aws_credentials" | jq -r .AccessKeyId )
secret_access_key=$( echo "$aws_credentials" | jq -r .SecretAccessKey )
session_token=$( echo "$aws_credentials" | jq -r .SessionToken )

curl "${api_execute_url}/events?pkPrefix=SESSION%23mockSessionId&skPrefix=TXMA%23EVENT_NAME#DCMAW_ASYNC_CRI_START" \
  --user "${access_key_id}":"${secret_access_key}" \
  --header "x-amz-security-token: ${session_token}" \
  --aws-sigv4 "aws:amz:eu-west-2:execute-api"

