variable "environment" {
  description = "The configured environment to deploy to, 1-2-1 mapping to each account"
  type        = string

  validation {
    condition     = contains(["dev", "build", "staging", "integration", "production"], var.environment)
    error_message = "The environment provided must be a valid environment"
  }
}
