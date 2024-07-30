variable "environment" {
  description = "The configured environment to deploy to, 1-2-1 mapping to each account"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "build", "staging", "integration", "prod"], var.environment)
    error_message = "The environment provided must be a valid environment"
  }
}

variable "stacks_to_import" {
  description = "Object configuring which stacks to import, if the stack is already deployed then set to true. This is to avoid working with remote state"
  type = object({
    api_gateway_logs          = optional(bool, true)
    build_notifications       = optional(bool, true)
    checkov_hook              = optional(bool, true)
    github_identity           = optional(bool, true)
    infrastructure_audit_hook = optional(bool, true)
    lambda_audit_hook         = optional(bool, true)
    signer                    = optional(bool, true)
    vpc                       = optional(bool, true)
  })
  default = {
    api_gateway_logs          = true
    build_notifications       = true
    checkov_hook              = true
    github_identity           = true
    infrastructure_audit_hook = true
    lambda_audit_hook         = true
    signer                    = true
    vpc                       = true
  }
}
