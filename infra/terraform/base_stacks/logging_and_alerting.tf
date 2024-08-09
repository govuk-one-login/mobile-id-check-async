
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
    InitialNotificationStack = "Yes"                                                      # Initial per account
    SlackWorkspaceId         = data.aws_ssm_parameter.SlackWorkspaceId.insecure_value     # insecure_value make visible in the plan
    SlackChannelId           = data.aws_ssm_parameter.SlackChannelId_build.insecure_value # insecure_value make visible in the plan
    EnrichedNotifications    = "True"
  }

  capabilities = ["CAPABILITY_AUTO_EXPAND", "CAPABILITY_IAM"]
}


resource "aws_cloudformation_stack" "alarms_sns" {
  name = "platform-alarms-sns"

  template_body = file("../../templates/alarms-sns/template.yaml")

  parameters = {
    Environment = var.environment
  }

  capabilities = ["CAPABILITY_AUTO_EXPAND"]
}

resource "aws_cloudformation_stack" "alarms_sns_us_east_1" {
  provider = aws.us-east-1

  name = "platform-alarms-sns"

  template_body = file("../../templates/alarms-sns/template.yaml")

  parameters = {
    Environment = var.environment
  }

  capabilities = ["CAPABILITY_AUTO_EXPAND"]
}

resource "aws_cloudformation_stack" "alarms_chatbot" {
  name = "platform-alarms-chatbot"

  template_body = file("../../templates/alarms-chatbot/template.yaml")

  parameters = {
    Environment = var.environment

    SlackWorkspaceId       = data.aws_ssm_parameter.SlackWorkspaceId.insecure_value
    SlackChannelIdCritical = data.aws_ssm_parameter.SlackChannelId_critical.insecure_value
    SlackChannelIdWarning  = data.aws_ssm_parameter.SlackChannelId_warning.insecure_value
    SlackChannelId2ndLine  = null # one(data.aws_ssm_parameter.SlackChannelId_di_2nd_line[*].insecure_value) # TODO Set once live system is ready.

    SNSTopicsCritical = join(",", [
      aws_cloudformation_stack.alarms_sns.outputs["AlarmCriticalSNSTopic"],
      aws_cloudformation_stack.alarms_sns_us_east_1.outputs["AlarmCriticalSNSTopic"],
    ])
    SNSTopicsWarning = join(",", [
      aws_cloudformation_stack.alarms_sns.outputs["AlarmWarningSNSTopic"],
      aws_cloudformation_stack.alarms_sns_us_east_1.outputs["AlarmWarningSNSTopic"],
    ])

    InitialNotificationStack = "No" // The honor was taken by `build-notifications`
  }

  capabilities = ["CAPABILITY_AUTO_EXPAND", "CAPABILITY_IAM"]
}
