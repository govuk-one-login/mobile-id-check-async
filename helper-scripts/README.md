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

This script provides the ability to deploy a custom `backend-api` stack in the AWS dev account.

### How to use it

#### Execute `deployBeToDev` npm script

```bash
# From /backend-api
npm run deployBeToDev <your-stack-name>
```

#### Follow the prompts

- Deploying an custom `sts-mock` stack:
  - This is required the first time you deploy a custom `backend-api` stack. It's optional for subsequent deployments.
- Generating Keys for `sts-mock`:
  - If you choose to deploy an `sts-mock`, you will be asked if you want to generate keys.
  - Key generation is required the first time you deploy an `sts-mock`. It's optional afterward.
- Deploying a custom `backend-api` stack:
  - Confirm whether you want to deploy a `backend-api` stack.
- Generating a local `.env` file for your `backend-api`:
  - Enables you to run API tests against your `backend-api` stack. It's optional and can be done anytime after deployment, see `backend-api` [README API tests](../backend-api/README.md#api-tests) for more information.
