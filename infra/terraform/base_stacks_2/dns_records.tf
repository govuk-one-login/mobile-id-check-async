resource "aws_cloudformation_stack" "dns_records" {
    name = "platform-dns-records"

    template_body = file("../../templates/dns-records/template.yaml")

    parameters = {
        Environment = var.environment
    }
}