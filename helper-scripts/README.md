# Helper scripts

## `delete_stack.sh`

This script provides the ability to:

- empty and delete any versioned S3 buckets (if present in a SAM application)
- delete the SAM application

```bash
export STACK_NAME=backend-stack-name    (REQUIRED)
./delete_stack.sh
```

## `index.ts` (in testing)

This script provides the ability to:

- empty and delete any versioned S3 buckets (if present in a SAM application)
- deletes multiple SAM applications
- delete SAM applications in a valid order to avoid dependency related deletion failures

The script will ask you for base stack names and lets a you pick associated stacks you want to delete.

The script delete stsMock and backend stacks in parallel and once finished, will delete backend cf-dists in parallel

Ensure you have all packages installed:

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

This script provides the ability to deploy a full backend application. This includes the cloudfront distribution, backend-api and test-resources applications. It also sets up local `.env` files for API testing.

### How to use it

#### Execute `deploy-backend-to-dev` script

```bash
# From /backend-api
npm run deploy-backend-to-dev <your-stack-name>
```

The deployed stacks will be named as follows:

- `<your-stack-name>-async-backend`
- `<your-stack-name>-test-resources`
- `<your-stack-name>-async-backend-cf-dist`

Note: This script generates individual `.env` files your `backend-api` stack and `test-resources` directories. This completes all setup needed to run API tests against your deployed backend application.
