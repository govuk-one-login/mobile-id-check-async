
resource "aws_cloudformation_stack" "iam-mob-app" {
  name = "platform-iam-mob-app"

  template_body = file("../../templates/iam-mob-app/template.yaml")

  parameters = {
    Environment = var.environment
  }
}
