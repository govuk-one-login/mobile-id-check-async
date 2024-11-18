#!/usr/bin/env bash
set -e

aws_account_name=di-mobile-id-check-async-staging

sh account_check.sh ${aws_account_name}

provisioner legacy --aws-account-name "${aws_account_name}" --stack-name mob-async-backend-pl --template-name sam-deploy-pipeline --template-version v2.68.1
