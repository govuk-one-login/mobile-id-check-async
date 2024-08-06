resource "aws_cloudformation_stack" "mob_async_backend_pl" {
  name = "mob-async-backend-pl"

  template_url = format(local.preformat_template_url,
    "sam-deploy-pipeline",             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/sam-deploy-pipeline
    "NGOxM_hPmNoY1pTz6vo8P_El2EqVz6sa" # v2.61.1
  )

  // Default parameters. Can be overwritten by using the locals below.
  parameters = merge(
    {
      Environment  = var.environment
      SAMStackName = "mob-async-backend"

      VpcStackName                     = "devplatform-vpc"
      CustomKmsKeyArns                 = "arn:aws:kms:eu-west-2:216552277552:key/4bc58ab5-c9bb-4702-a2c3-5d339604a8fe" # To support Dynatrace
      AdditionalCodeSigningVersionArns = "arn:aws:signer:eu-west-2:216552277552:/signing-profiles/DynatraceSigner/5uwzCCGTPq"

      BuildNotificationStackName = "devplatform-build-notifications"
      SlackNotificationType      = "All"
    },
    local.mob_async_backend_pl[var.environment]
  )

  capabilities = ["CAPABILITY_NAMED_IAM"]
}

locals {
  // Define environemnt specific parameters here. Will be merged and take precedence over the
  // parameters defined in the resource above.
  // https://developer.hashicorp.com/terraform/language/functions/merge
  // https://developer.hashicorp.com/terraform/language/functions/one
  mob_async_backend_pl = {
    dev = {
      OneLoginRepositoryName = "mobile-id-check-async"

      IncludePromotion = "No"

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_dev[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_dev[*].outputs["SigningProfileVersionArn"])
    }

    build = {
      OneLoginRepositoryName = "mobile-id-check-async"

      IncludePromotion = "Yes"
      AllowedAccounts  = local.account_vars.staging.account_id

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileVersionArn"])
    }

    staging = {
      ArtifactSourceBucketArn                 = one(data.aws_cloudformation_stack.mob_async_backend_pl_build[*].outputs["ArtifactPromotionBucketArn"])
      ArtifactSourceBucketEventTriggerRoleArn = one(data.aws_cloudformation_stack.mob_async_backend_pl_build[*].outputs["ArtifactPromotionBucketEventTriggerRoleArn"])

      # Stopping promotion at staging
      IncludePromotion = "No" # "Yes"
      AllowedAccounts  = null # join(",", [local.account_vars.integration.account_id, local.account_vars.production.account_id])

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileVersionArn"])
    }

    integration = {
      ArtifactSourceBucketArn                 = one(data.aws_cloudformation_stack.mob_async_backend_pl_staging[*].outputs["ArtifactPromotionBucketArn"])
      ArtifactSourceBucketEventTriggerRoleArn = one(data.aws_cloudformation_stack.mob_async_backend_pl_staging[*].outputs["ArtifactPromotionBucketEventTriggerRoleArn"])

      IncludePromotion = "No"

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileVersionArn"])
    }

    production = {
      ArtifactSourceBucketArn                 = one(data.aws_cloudformation_stack.mob_async_backend_pl_staging[*].outputs["ArtifactPromotionBucketArn"])
      ArtifactSourceBucketEventTriggerRoleArn = one(data.aws_cloudformation_stack.mob_async_backend_pl_staging[*].outputs["ArtifactPromotionBucketEventTriggerRoleArn"])

      IncludePromotion = "No"

      SigningProfileArn        = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileArn"])
      SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileVersionArn"])
    }
  }
}
