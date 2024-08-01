# Usage

## Installing Terraform

https://developer.hashicorp.com/terraform/install

### Homebrew

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

## Applying changes

All commands done from within the relevant terraform folder.

For `${environment}` as one of: [ `dev`, `build`, `integration`, `staging`, `prod` ]

Export AWS Credentials configured for the appropriate account.

Dev Example for base_stacks using AWS_PROFILE to set the aws credentials:

```bash
cd base_stacks
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

## Adding a new stack: devplatform template

1. Retrieve latest version id using `../scripts/get-latest-version.sh`. I.e. `sh ../scripts/get-latest-version.sh template-name`
2. Create a new `aws_cloudformation_stack` resource, setting the template_url, parameters and capabilities as required
3. Run the steps above

## Destroying a stack

1. Remove the `aws_cloudformation_stack` resource from the configuration
2. Run the steps in the [Applying Changes] section

NOTE: Some stacks may be blocked from being deleted if the resources it owns cannot be destroyed. For example S3 buckets.
