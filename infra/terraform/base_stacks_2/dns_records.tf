resource "aws_cloudformation_stack" "dns_records" {
  name = "platform-dns-records"

  template_body = file("../../templates/dns-records/template.yaml")

  parameters = {
    Environment = var.environment
  }
}

resource "aws_cloudformation_stack" "dns_records_us_east_1" {
  provider = aws.us-east-1

  name = "platform-dns-records"

  template_body = file("../../templates/dns-records/template.yaml")

  parameters = {
    Environment = var.environment
  }
}
