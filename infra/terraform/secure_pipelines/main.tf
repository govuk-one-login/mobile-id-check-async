variable "environment" {
  description = "The configured environment to deploy to, 1-2-1 mapping to each account"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "build", "staging", "integration", "prod"], var.environment)
    error_message = "The environment provided must be a valid environment"
  }
}

data "aws_ssm_parameter" "template_storage_bucket" {
  name = "/devplatform/template-storage-bucket"
}

terraform {
  backend "s3" {
    # bucket = "dmica-${local.environment}-tfs" # set by ../_backend/${local.environment}.s3.tfbackend as variables are unable to be used here
    key = "tf/secure-pipelines.tfstate"
  }
}

locals {
  template_bucket        = data.aws_ssm_parameter.template_storage_bucket.insecure_value
  preformat_template_url = "https://${data.aws_ssm_parameter.template_storage_bucket.insecure_value}.s3.amazonaws.com/%s/template.yaml?versionId=%s"

  is_artifact_account = contains(["dev", "build"], var.environment)

  account_vars = {
    dev         = { account_id = "211125300205" }
    build       = { account_id = "058264551042" }
    staging     = { account_id = "730335288219" }
    integration = { account_id = "992382392501" }
    prod        = { account_id = "339712924890" }
  }

  parameters = {
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

        IncludePromotion = "Yes"
        AllowedAccounts  = join(",", [local.account_vars.integration.account_id, local.account_vars.prod.account_id])

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

      prod = {
        ArtifactSourceBucketArn                 = one(data.aws_cloudformation_stack.mob_async_backend_pl_staging[*].outputs["ArtifactPromotionBucketArn"])
        ArtifactSourceBucketEventTriggerRoleArn = one(data.aws_cloudformation_stack.mob_async_backend_pl_staging[*].outputs["ArtifactPromotionBucketEventTriggerRoleArn"])

        IncludePromotion = "No"

        SigningProfileArn        = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileArn"])
        SigningProfileVersionArn = one(data.aws_cloudformation_stack.signer_build[*].outputs["SigningProfileVersionArn"])
      }
    }
  }
}

data "aws_cloudformation_stack" "mob_async_backend_pl_build" {
  provider = aws.build
  count    = var.environment == "staging" ? 1 : 0
  name     = "mob-async-backend-pl"
}

data "aws_cloudformation_stack" "mob_async_backend_pl_staging" {
  provider = aws.staging
  count    = contains(["integration", "prod"], var.environment) ? 1 : 0
  name     = "mob-async-backend-pl"
}

data "aws_cloudformation_stack" "signer_dev" {
  provider = aws.dev
  count    = contains(["dev"], var.environment) ? 1 : 0
  name     = "devplatform-signer"
}

data "aws_cloudformation_stack" "signer_build" {
  provider = aws.build
  count    = contains(["build", "staging", "integration", "prod"], var.environment) ? 1 : 0
  name     = "devplatform-signer"
}


resource "aws_cloudformation_stack" "mob_async_backend_pl" {
  name = "mob-async-backend-pl"

  template_url = format(local.preformat_template_url,
    "sam-deploy-pipeline",             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/sam-deploy-pipeline
    "NGOxM_hPmNoY1pTz6vo8P_El2EqVz6sa" # v2.61.1
  )

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
    local.parameters.mob_async_backend_pl[var.environment]
  )

  capabilities = ["CAPABILITY_NAMED_IAM"]
}
