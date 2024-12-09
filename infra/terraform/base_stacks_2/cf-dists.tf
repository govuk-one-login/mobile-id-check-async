resource "aws_cloudformation_stack" "cf_dist_backend_api" {
  name = "mob-async-backend-cf-dist"

  template_url = format(local.preformat_template_url,
    "cloudfront-distribution",         # https://github.com/govuk-one-login/devplatform/cloudformation-distribution
    "jZcckkadQOPteu3t24UktqjOehImqD1K" # v1.8.0
  )

  parameters = {
    DistributionAlias            = var.environment == "production" ? "review-b-async.account.gov.uk" : "review-b-async.${env}.account.gov.uk"
    CloudFrontCertArn            = aws_cloudformation_stack.dns_records_us_east_1.outputs["AsyncCertificateARN"]
    FraudHeaderEnabled           = "true"
    OriginCloakingHeader         = ""      // TODO: retrieve from SSM /secrets manager
    PreviousOriginCloakingHeader = ""      // TODO: retrieve from SSM /secrets manager
    StandardLoggingEnabled       = "false" // TODO: set to true in staging integration and prod
  }
}
