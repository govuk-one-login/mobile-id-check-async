# Helper scripts

## Stack Management Tool

### What Stack Management Tool does

This tool provides an interface to use the deploy and delete stack scripts described below,
as well as the ability to generate .env files for stacks that you haven't just deployed

### How to use Stack Management Tool

#### From `/backend-api`

```zsh
npm run manageStacks
```

#### From `/helper-scripts`

Ensure you have the latest packages installed

```zsh
npm i
```

Execute the tool

```zsh
npm run manageStacks
```

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

## Formatting

This helper-script directory uses Prettier as an opinionated formatter to ensure code style is consistent.

To format your code:

```bash
# From /helper-scripts
npm run format
```

To validate your code adheres to the formatting rules:

```bash
# From /helper-scripts
npm run format:check
```

## Linting

To lint your code:

```bash
# From /helper-scripts
npm run lint
```
