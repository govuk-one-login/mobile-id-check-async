# Helper scripts

## `delete_stack.sh`

This script provides the ability to:

- empty and delete any versioned S3 buckets (if present in a SAM application)
- delete the SAM application

```bash
export STACK_NAME=backend-stack-name    (REQUIRED)
./delete_stack.sh
```

## `deploy_backend.sh`

### What it does

This script provides the ability to deploy a `backend-api` stack in the AWS dev account.

### How to use it

#### Execute `deploy-be-to-dev` script

```bash
# From /backend-api
npm run deploy-be-to-dev <your-stack-name>
```

#### Follow the prompts

1. Deploying an `sts-mock` stack. This is required the first time you deploy a `backend-api` stack. It's optional for subsequent deployments.
2. Generating keys for `sts-mock`. If you choose to deploy an `sts-mock`, you will be asked if you want to generate keys. Key generation is required the first time you deploy an `sts-mock`. It's optional afterward.
3. Deploying a `backend-api` stack. Confirm whether you want to deploy a `backend-api` stack. Generates `.env` file for api testing.
