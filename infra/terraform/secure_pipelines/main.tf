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
