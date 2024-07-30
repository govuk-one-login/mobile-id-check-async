
resource "aws_cloudformation_stack" "api_gateway_logs" {
  name = "devplatform-api-gateway-logs"

  template_url = format(local.preformat_template_url,
    "api-gateway-logs",                # https://github.com/govuk-one-login/devplatform-deploy/tree/main/api-gateway-logs
    "k7pTX3pK1Ahrk5GCHjUBxEn_hSMNQh8D" # v1.0.5
  )

  capabilities = ["CAPABILITY_IAM"]
}

resource "aws_cloudformation_stack" "build_notifications" {
  name = "devplatform-build-notifications"

  template_url = format(local.preformat_template_url,
    "build-notifications",             # https://github.com/govuk-one-login/devplatform-deploy/tree/main/build-notifications
    "jgBwAnncLZdnOZwPMoHfI0z9eac8HOtu" # v2.3.2
  )

  parameters = {
    InitialNotificationStack = "Yes"                                                                    # Initial per account
    SlackWorkspaceId         = data.aws_ssm_parameter.SlackWorkspaceId.insecure_value                   # insecure_value make visible in the plan
    SlackChannelId           = data.aws_ssm_parameter.build_notifications_SlackChannelId.insecure_value # insecure_value make visible in the plan
    EnrichedNotifications    = "True"
  }

  capabilities = ["CAPABILITY_AUTO_EXPAND", "CAPABILITY_IAM"]
}
