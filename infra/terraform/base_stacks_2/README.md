# Before applying changes

For initial configuration please refer to the README file located in ./infra/terraform

This base_stacks_2 directory is only to be deployed after the deployment of the original base_stacks as dns_records.tf is dependent on dns.tf being deployed first.

# Applying changes

All commands done from within the relevant terraform folder.

For `${environment}` as one of: [ `dev`, `build`, `integration`, `staging`, `production` ]

Export AWS Credentials configured for the appropriate account.

Dev Example for base_stacks using AWS_PROFILE to set the aws credentials:

```bash
cd base_stacks_2
env=dev
export AWS_PROFILE=async-${env}

terraform init \
  -reconfigure \
  -backend-config="../_backend/${env}.s3.tfbackend"

terraform plan \
  -var "environment=${env}"

terraform apply \
  -var "environment=${env}"
```

Ensure to review the plan before completing the apply.

## Destroying a stack

1. Remove the `aws_cloudformation_stack` resource from the configuration
2. Run the steps in the [Applying Changes] section

NOTE: Some stacks may be blocked from being deleted if the resources it owns cannot be destroyed. For example S3 buckets.