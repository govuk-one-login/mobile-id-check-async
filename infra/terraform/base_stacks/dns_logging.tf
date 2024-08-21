resource "aws_cloudformation_stack" "dns-logging" {
    name = "platform-dns-logging"

    template_body = file("../../templates/dns-logging/template.yaml")

    parameters = { 
        Environment = var.environment
    }
    
}