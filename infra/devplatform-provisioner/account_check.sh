#!/usr/bin/env bash

aws_account_name=${1}

accounts_json='{
  "di-mobile-id-check-async-build":       "058264551042",
  "di-mobile-id-check-async-dev":         "211125300205",
  "di-mobile-id-check-async-integration": "992382392501",
  "di-mobile-id-check-async-prod":        "339712924890",
  "di-mobile-id-check-async-staging":     "730335288219"
}'

caller_account="$(aws sts get-caller-identity | jq --raw-output .Account)"
caller_account_name="$(echo "${accounts_json}" | jq --raw-output --arg caller_account "${caller_account}" '. | to_entries | .[] | select(.value == $caller_account) | .key')"
deployment_account="$(echo "${accounts_json}" | jq --raw-output --arg aws_account_name "${aws_account_name}" '.[$aws_account_name]')"

if [ "${caller_account}" != "${deployment_account}" ]; then
  echo "ERROR: Incorrect crdentials in use for ${aws_account_name} account"
  echo "  Caller Account:     ${caller_account} - ${caller_account_name}"
  echo "  Deployment Account: ${deployment_account} - ${aws_account_name}"
  exit 1
fi
