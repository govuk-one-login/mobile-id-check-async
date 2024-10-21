# Helper scripts

## delete_stack.sh

This script provides the ability to:
- empty and delete any versioned S3 buckets (if present in a SAM application)
- delete the SAM application

```bash
export STACK_NAME=backend-stack-name    (REQUIRED)
./delete_stack.sh
```

## deploy_backend.sh

### What it does

- Deploys a custom Backend API
- Optionally deploys a custom STS Mock
- Optionally generates keys for the custom STS mock if an STS Mock is deployed

### How to use it

#### Run the script with your desired stack name

```bash
sh deploy_backend.sh <your-stack-name>
```

#### Follow the prompts

- Deploy Backend API: Confirm whether to build and deploy a custom Backend API (REQUIRED).
- Deploy STS Mock: Must be deployed the first time you deploy a custom Backend API (OPTIONAL AFTER FIRST DEPLOYMENT).
- Generate Keys: Must be done the first time you deploy a custom STS mock (OPTIONAL AFTER FIRST DEPLOYMENT).

#### Check logs (optional)

Logs are saved in the `/deployLogs` directory.
Log filenames correspond to the stack names, e.g., <stack-name>-backend.log
