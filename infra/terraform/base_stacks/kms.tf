
resource "aws_cloudformation_stack" "kms" {
  name = "platform-kms"

  template_body = file("../../templates/kms/template.yaml")

  parameters = {
    Environment = var.environment
  }
}
