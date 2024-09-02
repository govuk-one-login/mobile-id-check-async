resource "aws_cloudformation_stack" "mob_sts_mock_pipeline" {
    name = "mob-sts-mock-pipeline"

    template_url = format(local.preformat_template_url,
    "sam-deploy-pipeline",             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/sam-deploy-pipeline
    "VsTCw4M76yOZXOvXrX6_DrRBGcSFwqRk" # v2.66.0
  )

  // Default parameters. Can be overwritten by using the locals below.
  parameters = merge(
    {
      Environment  = var.environment
      SAMStackName = "sts-mock"

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

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_dev[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_dev[*].outputs["SigningProfileVersionArn"])

      TestImageRepositoryUri = "211125300205.dkr.ecr.eu-west-2.amazonaws.com/mob-sts-mock-tir-testrunnerimagerepository-poubsup3aw8j"
    }

    build = {
      OneLoginRepositoryName = "mobile-id-check-async"

      IncludePromotion = "No"
      AllowedAccounts  = local.account_vars.staging.account_id

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileVersionArn"])

      # TestImageRepositoryUri = To be added after pipeline and tir is deployed in Build
    }
  }
}