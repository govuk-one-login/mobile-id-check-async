resource "aws_cloudformation_stack" "vpc" {
  name = "devplatform-vpc"

  template_url = format(local.preformat_template_url,
    "vpc",                             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/vpc
    "DbePTnGzHq7c8HcbPN_Yb6SZs86Xth3r" # v2.5.3
  )

  capabilities = ["CAPABILITY_AUTO_EXPAND", "CAPABILITY_IAM"]

  parameters = {
    SSMParametersStoreEnabled = "Yes"
    // TODO: Enable AWS Service APIs as required
    DynamoDBApiEnabled       = "Yes"
    ExecuteApiGatewayEnabled = "Yes"
    KMSApiEnabled            = "Yes"
    LogsApiEnabled            = "Yes"
    S3ApiEnabled             = "Yes"
    SQSApiEnabled            = "Yes"
    SecretsManagerApiEnabled = "Yes"
    SSMApiEnabled            = "Yes"
    AllowRules               = "pass tls $HOME_NET any -> $EXTERNAL_NET 443 (tls.sni; content:\".account.gov.uk\"; endswith; msg:\"Pass TLS to *.account.gov.uk\"; flow:established; sid:2001; rev:1;)"
  }
}
