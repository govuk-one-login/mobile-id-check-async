provider "aws" {
  region              = "eu-west-2"
  allowed_account_ids = [local.account_vars[var.environment].account_id]
}

// Account providers used to pull in cloudformation stack outputs from prior accounts.
// Bad practice - use with caution. Should be replaced with hardcoded values once known.

provider "aws" {
  alias               = "dev"
  profile             = "async-dev"
  region              = "eu-west-2"
  allowed_account_ids = [local.account_vars["dev"].account_id]
}

provider "aws" {
  alias               = "build"
  profile             = "async-build"
  region              = "eu-west-2"
  allowed_account_ids = [local.account_vars["build"].account_id]
}

provider "aws" {
  alias               = "staging"
  profile             = "async-staging"
  region              = "eu-west-2"
  allowed_account_ids = [local.account_vars["staging"].account_id]
}

provider "aws" {
  alias               = "integration"
  profile             = "async-integration"
  region              = "eu-west-2"
  allowed_account_ids = [local.account_vars["integration"].account_id]
}

provider "aws" {
  alias               = "production"
  profile             = "async-production"
  region              = "eu-west-2"
  allowed_account_ids = [local.account_vars["production"].account_id]
}
