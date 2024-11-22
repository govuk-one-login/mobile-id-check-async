data "aws_ssm_parameter" "template_storage_bucket" {
  name = "/devplatform/template-storage-bucket"
}
