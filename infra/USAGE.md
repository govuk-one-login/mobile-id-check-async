# Usage

## Installing Terraform

https://developer.hashicorp.com/terraform/install

### Homebrew

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

## Applying changes

All commands done from within the terraform folder.

For `${environment}` as one of: [ `dev`, `build`, `integration`, `staging`, `prod` ]

Export AWS Credentials configured for the appropriate account.

Dev Example:

```bash
environment=dev

terraform init \
  -reconfigure \
  -backend-config="../_backend/${environment}.s3.tfbackend"

terraform plan \
  -var "environment=${environment}"

terraform apply \
  -var "environment=${environment}"
```

Ensure to review the plan before completing the apply.

## Adding a new stack: devplatform template

1. Retrieve latest version id using `../scripts/get-latest-version.sh`. I.e. `sh ../scripts/get-latest-version.sh template-name`
2. Create a new `aws_cloudformation_stack` resource, setting the template_url, parameters and capabilities as required

## Destroying a stack

1. Ensure the state is up to date by running a terraform apply.

```bash
environment=dev

terraform init \
  -reconfigure \
  -backend-config="../_backend/${environment}.s3.tfbackend"

terraform apply \
  -var "environment=${environment}"
```

2. Remove the `aws_cloudformation_stack` resource from the configuration and its associated import block.
3. Run a second apply to destroy the stack.
