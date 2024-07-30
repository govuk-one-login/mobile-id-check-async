data "aws_ssm_parameter" "template_storage_bucket" {
  name = "/devplatform/template-storage-bucket"
}

data "aws_ssm_parameter" "SlackWorkspaceId" {
  name = "/devplatform/input-parameters/SlackWorkspaceId"
}

data "aws_ssm_parameter" "build_notifications_SlackChannelId" {
  name = "/devplatform/input-parameters/build-notifications/SlackChannelId"
}
