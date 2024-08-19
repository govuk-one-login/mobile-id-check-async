resource "aws_cloudformation_stack" "dns-records-and-logging" {
    name = "platform-dns-records-logging"

    template_body = "../..templates/dns-records-and-logging/template.yaml"

    parameters {
        Environment = var.environment

        }
}