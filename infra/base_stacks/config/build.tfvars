environment = "build"
stacks_to_import = {
  api_gateway_logs          = true
  build_notifications       = true
  checkov_hook              = true
  github_identity           = true
  infrastructure_audit_hook = true
  lambda_audit_hook         = true
  signer                    = true
  vpc                       = true
}
