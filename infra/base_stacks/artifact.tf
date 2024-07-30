
resource "aws_cloudformation_stack" "github_identity" {
  count = local.is_artifact_account ? 1 : 0

  name = "devplatform-github-identity"

  template_url = format(local.preformat_template_url,
    "github-identity",                 # https://github.com/govuk-one-login/devplatform-deploy/tree/main/github-identity
    "eA2KQSivjkZIIpAV0M15Eo5DoB8rfPmD" # v1.1.1
  )

  parameters = {
    Environment = var.environment
    System      = "ID Check - Github Runner"
  }
}

resource "aws_cloudformation_stack" "signer" {
  count = local.is_artifact_account ? 1 : 0

  name = "devplatform-signer"

  template_url = format(local.preformat_template_url,
    "signer",                          # https://github.com/govuk-one-login/devplatform-deploy/tree/main/signer
    "u5KejsTCRYh47HnulR9rkyOkRWehwPEf" # v1.0.8
  )

  parameters = {
    Environment = var.environment
    System      = "ID Check - Github Runner"
  }
}
