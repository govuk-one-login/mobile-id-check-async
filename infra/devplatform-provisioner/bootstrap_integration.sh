#!/usr/bin/env bash
set -e

aws_account_name=di-mobile-id-check-async-integration

sh account_check.sh ${aws_account_name}

provisioner legacy --aws-account-name "${aws_account_name}" --stack-name devplatform-vpc                       --template-name vpc                       --tempplate-version v2.5.3
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name devplatform-api-gateway-logs          --template-name api-gateway-logs          --tempplate-version v1.0.5
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name devplatform-build-notifications       --template-name build-notifications       --tempplate-version v2.3.2
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name devplatform-checkov-hook              --template-name checkov-hook              --tempplate-version latest
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name devplatform-infrastructure-audit-hook --template-name infrastructure-audit-hook --tempplate-version latest
provisioner legacy --aws-account-name "${aws_account_name}" --stack-name devplatform-lambda-audit-hook         --template-name lambda-audit-hook --tempplate-version latest
