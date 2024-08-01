provider "aws" {
  allowed_account_ids = [local.account_vars[var.environment].account_id]
}

// Account providers used to pull in cloudformation stack outputs from prior accounts.
// Bad practice - use with caution. Should be replaced with hardcoded values once known.

provider "aws" {
  alias               = "dev"
  profile             = "async-dev"
  allowed_account_ids = [local.account_vars["dev"].account_id]
}

provider "aws" {
  alias               = "build"
  profile             = "async-build"
  allowed_account_ids = [local.account_vars["build"].account_id]
}

provider "aws" {
  alias               = "staging"
  profile             = "async-staging"
  allowed_account_ids = [local.account_vars["staging"].account_id]
}

provider "aws" {
  alias               = "integration"
  profile             = "async-integration"
  allowed_account_ids = [local.account_vars["integration"].account_id]
}

provider "aws" {
  alias               = "prod"
  profile             = "async-prod"
  allowed_account_ids = [local.account_vars["prod"].account_id]
}
