# Usage

## Installing Terraform

https://developer.hashicorp.com/terraform/install

### Homebrew

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

## Applying changes

For `${environment}` as one of: [ `dev`, `build`, `integration`, `staging`, `prod` ]

Export AWS Credentials configured for the appropriate account.

Dev Example:

```bash
environment=dev

terraform init \
  -reconfigure \
  -backend-config="config/${environment}.local.tfbackend"

terraform plan \
  -var-file="config/${environment}.tfvars"

terraform apply \
  -var-file="config/${environment}.tfvars"
```

Ensure to review the plan before completing the apply.

## Adding a new stack: devplatform template

1. Retrieve latest version id using `../scripts/get-latest-version.sh`. I.e. `sh ../scripts/get-latest-version.sh template-name`
2. Create a new `aws_cloudformation_stack` resource, setting the template_url, parameters and capabilities as required
3. Add the stack to the `stack_to_import` variable.
4. Create an `import` block for the `aws_cloudformation_stack` resource using that variable.
5. With the `stack_to_import['${stack_name}']` variable set to false run terraform to create the stack.
6. Set the variable to true in the `config/${env}.tfvars` file

## Destroying a stack

1. Ensure the state is up to date by running a terraform apply.

```bash
environment=dev

terraform init \
  -reconfigure \
  -backend-config="config/${environment}.local.tfbackend"

terraform apply \
  -var-file="config/${environment}.tfvars"
```

2. Remove the `aws_cloudformation_stack` resource from the configuration and its associated import block.
3. Run a second apply to destroy the stack.
