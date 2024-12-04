resource "aws_cloudformation_stack" "vpc" {
  name = "devplatform-vpc"

  template_url = format(local.preformat_template_url,
    "vpc",                             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/vpc
    "8ZS6GB2nOcOdOGWjGUpRjs19kqdcfIGg" # v2.7.0
  )

  capabilities = ["CAPABILITY_AUTO_EXPAND", "CAPABILITY_IAM"]

  parameters = {
    AllowRules                      = "pass tls $HOME_NET any -> $EXTERNAL_NET 443 (tls.sni; content:\".account.gov.uk\"; endswith; msg:\"Pass TLS to *.account.gov.uk\"; flow:established; sid:2001; rev:1;)"
    CloudFormationEndpointEnabled   = "Yes"
    DynamoDBApiEnabled              = "Yes"
    DynatraceApiEnabled             = "Yes"
    ExecuteApiGatewayEnabled        = "Yes"
    KMSApiEnabled                   = "Yes"
    LogsApiEnabled                  = "Yes"
    S3ApiEnabled                    = "Yes"
    SecretsManagerApiEnabled        = "Yes"
    SQSApiEnabled                   = "Yes"
    SSMApiEnabled                   = "Yes"
    SSMParametersStoreEnabled       = "Yes"
  }
}
