

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

provider "aws" {
  allowed_account_ids = [local.account_vars[var.environment].account_id]
}

terraform {
  backend "local" {} // set by config/${ENV}.local.tfbackend
}
