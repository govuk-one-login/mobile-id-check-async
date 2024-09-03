resource "aws_cloudformation_stack" "mob_sts_mock_tir" {
  count = contains(["dev", "build"], var.environment) ? 1 : 0

  name = "mob-sts-mock-tir"

  template_url = format(local.preformat_template_url,
    "test-image-repository",           # https://github.com/govuk-one-login/devplatform-deploy/tree/main/test-image-repository
    "Vnlbt5pKPSiqbLLRTxPRo1VzHZ1nyHsJ" # v1.2.0
  )

  // Default parameters. Can be overwritten by using the locals below.
  parameters = merge(
    {
      PipelineStackName  = "mob-sts-mock-pl"
      RetainedImageCount = 25
    }
  )

  capabilities = ["CAPABILITY_NAMED_IAM"]
}
