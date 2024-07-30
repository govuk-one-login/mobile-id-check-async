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

AWS Credentials configured for the appropriate account.

Dev Example:

```bash
environment=dev

terraform init \
  -reconfigure \
  -backend-config="config/${environment}.local.tfbackend"

terraform apply \
  -var-file="config/${environment}.tfvars"
```

Ensure to review the plan before completing the apply.
