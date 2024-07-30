
resource "aws_cloudformation_stack" "lambda_audit_hook" {
  name = "devplatform-lambda-audit-hook"

  template_url = format(local.preformat_template_url,
    "lambda-audit-hook",               # https://github.com/govuk-one-login/devplatform-lambda-audit-hook
    "phKhZapUPNHlSr2_PYCH9J14EGlZPUZr" # $latest
  )

  capabilities = ["CAPABILITY_IAM"]
}

resource "aws_cloudformation_stack" "checkov_hook" {
  name = "devplatform-checkov-hook"

  template_url = format(local.preformat_template_url,
    "checkov-hook",                    # https://github.com/govuk-one-login/devplatform-checkov-hook
    "FVWuVMavFgSQ8YRJ..wyXntoPMLqCgxE" # $latest
  )

  parameters = {
    FailureMode = "WARN"
  }

  capabilities = ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"]
}

resource "aws_cloudformation_stack" "infrastructure_audit_hook" {
  name = "devplatform-infrastructure-audit-hook"

  template_url = format(local.preformat_template_url,
    "infrastructure-audit-hook",       # https://github.com/govuk-one-login/devplatform-infra-audit-hook
    "ZUzu967AP2HZuvTXOU7ThSvEERLky24Y" # $latest
  )

  capabilities = ["CAPABILITY_IAM"]
}
