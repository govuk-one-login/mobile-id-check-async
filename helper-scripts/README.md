# Helper scripts

## `deleteStacks.ts`

### What it does

- empty and delete any versioned S3 buckets (if present in a SAM application)
- delete SAM applications in the correct order (based on stack dependencies)
- allows deletion of multiple sets of SAM applications

### How to use it

```bash
# From /helper-scripts
npm run deleteStacks
```

Follow the prompts to delete your desired stacks

### Deleting stacks with non-standard name

If you have a deployed a stack that does not following our naming convention, you can delete it by:

```bash
# From /helper-scripts
./delete_stack.sh <your-stack-name>
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

## `generateHashedSecret.ts`

### What it does

Takes in secret and salt values, and uses them to return a hashed secret as a hexadecimal string. This is then used as the client secret in the client registry.

### How to use it

```bash
# From /helper-scripts
npm run generateHashedSecret
```

## Formatting

This helper-script directory uses Prettier as an opinionated formatter to ensure code style is consistent.

### Format your code

```bash
# From /helper-scripts
npm run format
```

### Validate your code adheres to the formatting rules

```bash
# From /helper-scripts
npm run format:check
```

## Linting

### Lint your code

```bash
# From /helper-scripts
npm run lint
```
