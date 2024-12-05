#!/usr/bin/env bash
set -e

aws_account_name=di-mobile-id-check-async-dev

sh account_check.sh ${aws_account_name}

provisioner legacy --aws-account-name "${aws_account_name}" --stack-name mob-async-backend-pl  --template-name sam-deploy-pipeline   --template-version v2.68.1
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name mob-async-backend-tir --template-name test-image-repository --template-version v1.1.10
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name mob-sts-mock-pl       --template-name sam-deploy-pipeline   --template-version v2.68.1
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name mob-sts-mock-tir      --template-name test-image-repository --template-version v1.2.0
