resource "aws_cloudformation_stack" "mob_async_backend_tir" {
  count = contains(["dev", "build"], var.environment) ? 1 : 0

  name = "mob-async-backend-tir"

  template_url = format(local.preformat_template_url,
    "test-image-repository",           # https://github.com/govuk-one-login/devplatform-deploy/tree/main/test-image-repository
    "RLXrgmf5PmexqA92_cTZD7Bi.A4zYp_A" # v1.1.10
  )

  // Default parameters. Can be overwritten by using the locals below.
  parameters = merge(
    {
      PipelineStackName  = "mob-async-backend-pl"
      RetainedImageCount = 25
    }
  )

  capabilities = ["CAPABILITY_NAMED_IAM"]
}
