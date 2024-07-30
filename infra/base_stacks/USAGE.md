# Usage

For `${environment}` as one of: [ `dev`, `build`, `integration`, `staging`, `prod` ]

AWS Credentials configured for the appropriate account.

Dev Example:

```bash
environment=dev

terraform init \
  -backend-config="config/${environment}.local.tfbackend"

terraform apply \
  -var-file="config/${environment}.tfvars"
```
