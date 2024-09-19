resource "aws_cloudformation_stack" "mob_sts_mock_pipeline" {
    name = "mob-sts-mock-pl"

    template_url = format(local.preformat_template_url,
    "sam-deploy-pipeline",             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/sam-deploy-pipeline
    "VsTCw4M76yOZXOvXrX6_DrRBGcSFwqRk" # v2.66.0
  )

  // Default parameters. Can be overwritten by using the locals below.
  parameters = merge(
    {
      Environment  = var.environment
      SAMStackName = "mob-sts-mock"

      VpcStackName                     = "devplatform-vpc"
      CustomKmsKeyArns                 = "arn:aws:kms:eu-west-2:216552277552:key/4bc58ab5-c9bb-4702-a2c3-5d339604a8fe" # To support Dynatrace
      AdditionalCodeSigningVersionArns = "arn:aws:signer:eu-west-2:216552277552:/signing-profiles/DynatraceSigner/5uwzCCGTPq"

      BuildNotificationStackName = "devplatform-build-notifications"
      SlackNotificationType      = "All"
    },
    local.mob_sts_mock_pipeline[var.environment]
  )

  capabilities = ["CAPABILITY_NAMED_IAM"]
}

locals {
  // Define environment specific parameters here. Will be merged and take precedence over the
  // parameters defined in the resource above.
  // https://developer.hashicorp.com/terraform/language/functions/merge
  // https://developer.hashicorp.com/terraform/language/functions/one
  mob_sts_mock_pipeline = {
    dev = {
      OneLoginRepositoryName = "mobile-id-check-async"

      IncludePromotion = "No"

      # Test signing and container values commented out here until Dockerfile.test is created, signed and we can run the tests in the pipeline

      ContainerSignerKmsKeyArn = one(data.aws_cloudformation_stack.container_signer_dev[*].outputs["ContainerSignerKmsKeyArn"])
      #RequireTestContainerSignatureValidation = "Yes"

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_dev[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_dev[*].outputs["SigningProfileVersionArn"])

      TestImageRepositoryUri = one(aws_cloudformation_stack.mob_sts_mock_tir[*].outputs["TestRunnerImageEcrRepositoryUri"])
    }

    build = {
      OneLoginRepositoryName = "mobile-id-check-async"

      IncludePromotion = "No"
      AllowedAccounts  = local.account_vars.staging.account_id

      # Test signing and container values commented out here until Dockerfile.test is created, signed and we can run the tests in the pipeline

      ContainerSignerKmsKeyArn = one(data.aws_cloudformation_stack.container_signer_build[*].outputs["ContainerSignerKmsKeyArn"])
      #RequireTestContainerSignatureValidation = "Yes"

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileVersionArn"])

      #TestImageRepositoryUri = one(aws_cloudformation_stack.mob_sts_mock_tir[*].outputs["TestRunnerImageEcrRepositoryUri"])
    }
  }
}