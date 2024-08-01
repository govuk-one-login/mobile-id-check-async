resource "aws_cloudformation_stack" "vpc" {
  name = "devplatform-vpc"


  template_url = format(local.preformat_template_url,
    "vpc",                             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/vpc
    "DbePTnGzHq7c8HcbPN_Yb6SZs86Xth3r" # v2.5.3
  )

  capabilities = ["CAPABILITY_AUTO_EXPAND", "CAPABILITY_IAM"]

  parameters = {
    SSMParametersStoreEnabled = "Yes"
    // TODO: Enable AWS Service APIs as required
  }
}
