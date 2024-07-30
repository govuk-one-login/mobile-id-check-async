import {
  for_each = var.stacks_to_import.api_gateway_logs ? [0] : []
  to       = aws_cloudformation_stack.api_gateway_logs
  id       = "devplatform-api-gateway-logs"
}

import {
  for_each = var.stacks_to_import.build_notifications ? [0] : []
  to       = aws_cloudformation_stack.build_notifications
  id       = "devplatform-build-notifications"
}

import {
  for_each = var.stacks_to_import.checkov_hook ? [0] : []
  to       = aws_cloudformation_stack.checkov_hook
  id       = "devplatform-checkov-hook"
}

import {
  for_each = var.stacks_to_import.github_identity && local.is_artifact_account ? [0] : []
  to       = aws_cloudformation_stack.github_identity[0]
  id       = "devplatform-github-identity"
}

import {
  for_each = var.stacks_to_import.infrastructure_audit_hook ? [0] : []
  to       = aws_cloudformation_stack.infrastructure_audit_hook
  id       = "devplatform-infrastructure-audit-hook"
}

import {
  for_each = var.stacks_to_import.lambda_audit_hook ? [0] : []
  to       = aws_cloudformation_stack.lambda_audit_hook
  id       = "devplatform-lambda-audit-hook"
}

import {
  for_each = var.stacks_to_import.signer && local.is_artifact_account ? [0] : []
  to       = aws_cloudformation_stack.signer[0]
  id       = "devplatform-signer"
}

import {
  for_each = var.stacks_to_import.vpc ? [0] : []
  to       = aws_cloudformation_stack.vpc
  id       = "devplatform-vpc"
}
