variable "environment" {
  description = "The configured environment to deploy to, 1-2-1 mapping to each account"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "build", "staging", "integration", "prod"], var.environment)
    error_message = "The environment provided must be a valid environment"
  }
}

locals {
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

resource "aws_s3_bucket" "tfs" {
  bucket = "dmica-${var.environment}-tfs"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "tfs" {
    bucket = aws_s3_bucket.tfs.id

    versioning_configuration {
      status = "Enabled"
    }
}

# Comment out on first run
terraform {
  backend "s3" {
    key = "tf/backend-s3.tfstate"
  }
}
