data "aws_ssm_parameter" "template_storage_bucket" {
  name = "/devplatform/template-storage-bucket"
}

data "aws_ssm_parameter" "SlackWorkspaceId" {
  name = "/devplatform/input-parameters/SlackWorkspaceId"
}

data "aws_ssm_parameter" "SlackChannelId_build" {
  name = "/devplatform/input-parameters/SlackChannelId/build"
}

data "aws_ssm_parameter" "SlackChannelId_warning" {
  name = "/devplatform/input-parameters/SlackChannelId/warning"
}

data "aws_ssm_parameter" "SlackChannelId_critical" {
  name = "/devplatform/input-parameters/SlackChannelId/critical"
}

data "aws_ssm_parameter" "SlackChannelId_di_2nd_line" {
  count = var.environment == "production" ? 1 : 0

  name = "/devplatform/input-parameters/SlackChannelId/di-2nd-line"
}
