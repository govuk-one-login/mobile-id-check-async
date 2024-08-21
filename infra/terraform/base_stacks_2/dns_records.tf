resource "aws_cloudformation_stack" "dns-records" {
    name = "platform-dns-records-logging"

    template_body = file("../..templates/dns-records/template.yaml")

    parameters = {
        Environment = var.environment
    }

    depends_on = [aws_cloudformation_stack.dns]
}