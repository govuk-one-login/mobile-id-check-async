resource "aws_cloudformation_stack" "dns" {
    name = "platform-dns"
    
    template_body = file("../../templates/dns/template.yaml")

    parameters = {
        Environment = var.environment
    }
}