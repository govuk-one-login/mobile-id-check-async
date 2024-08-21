locals {
  
  account_vars = {
    dev         = { account_id = "211125300205" }
    build       = { account_id = "058264551042" }
    staging     = { account_id = "730335288219" }
    integration = { account_id = "992382392501" }
    production  = { account_id = "339712924890" }
  }
}

provider "aws" {
  region = "eu-west-2"

  allowed_account_ids = [local.account_vars[var.environment].account_id]
}

terraform {
  backend "s3" {
    # bucket = "dmica-${local.environment}-tfs" # set by ../_backend/${local.environment}.s3.tfbackend as variables are unable to be used here
    key = "tf/base-stacks-2.tfstate"
  }
}