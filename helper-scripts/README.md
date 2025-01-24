# Helper scripts

## `delete_stack.sh`

This script provides the ability to:

- empty and delete any versioned S3 buckets (if present in a SAM application)
- delete the SAM application

```bash
export STACK_NAME=backend-stack-name    (REQUIRED)
./delete_stack.sh
```

## `deleteStacks.mts` (in testing - not approved)

This script provides the ability to:

- empty and delete any versioned S3 buckets (if present in a SAM application)
- deletes multiple SAM applications
- delete SAM applications in a valid order to avoid dependency related deletion failures

Add the name of any stack you want to delete, in a string format, to the appropriate array within `./deleteStackUtils/stacksToDelete.ts`

Ensure you have the `zx` package installed:

```bash
# From /helper-scripts
npm i
```

Delete your stacks:

```bash
# From /helper-scripts
npm run deleteStacks
```

## `deploy_backend.sh`

### What it does

This script provides the ability to deploy a `backend-api` stack in the AWS dev account.

### How to use it

#### Execute `deploy-backend-to-dev` script

```bash
# From /backend-api
npm run deploy-backend-to-dev <your-stack-name>
```

The deployed stacks will be named as follows:

- `<your-stack-name>-async-backend`
- `<your-stack-name>-sts-mock`

Note: This script will generate an `.env` file your `backend-api` stack to allow api testing
