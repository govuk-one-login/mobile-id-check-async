# Test Resources

## Overview

### STS Mock
This stack manages the following resources needed for the STS mock API:
* a REST API and a Lambda function for the `/token` endpoint
* an S3 bucket for storing the private key and also storing and serving the public key (`/.well-known/jwks.json`)

### Dequeue
This provides functionality to retrieve events sent to the TxMA SQS (for more, see the [Dequeue README](./docs/dequeue.md)). This can then be used to validate TxMA SQS events in the backend API test suite.

## Pre-requisites
- Node.js v20
- npm
- AWS CLI
- AWS SAM
- rain v1.15

## Quickstart
### Installing dependencies
```bash
npm install
```

## Testing
### Unit tests
```bash
npm run test:unit
```

### Infrastructure tests
```bash
npm run test:infra
```

### API tests
1. Activate AWS credentials
2. [Deploy your stack](#deploy-to-dev)
3. Generate a `.env` file for your deployed stack
```bash
sh generate_env_file.sh <stack_name>
```
4. Run tests
```bash
npm run test:api
```

### Formatting
To format your code:
```bash
npm run format
```

To validate your code adheres to the formatting rules:
```bash
npm run format:check
```

### Linting
To lint your code:
```bash
npm run lint
```

## Deploy to `dev`

### Testing changes in `backend-api`

If you are deploying a `test-resources` stack to test local changes made in `backend-api`, please follow the deployment instructions found in the helper-scripts [README](../helper-scripts/README.md).

If you are testing local changes made in `test-resources` only, follow the below instructions.

### Manual Deployment
To manually deploy changes made to the stack (i.e. resources or source code) to the `dev` AWS account, run the following command after assuming your credentials:
```shell
sam build --cached --beta-features
sam deploy --guided --capabilities CAPABILITY_NAMED_IAM
```

Follow the AWS SAM CLI interactive flow to configure your application settings:

```shell
Configuring SAM deploy
======================

	Looking for config file [samconfig.toml] :  Found
	Reading default arguments  :  Success

	Setting default arguments for 'sam deploy'
	=========================================
	Stack Name []: ENTER YOUR STACK NAME
	AWS Region [eu-west-2]:
	Parameter Environment [dev]:
	Parameter CodeSigningConfigArn [none]:
	Parameter PermissionsBoundary [none]:
	Parameter DevOverrideAsyncBackendBaseUrl [none]:
	#Shows you resources changes to be deployed and require a 'Y' to initiate deploy
	Confirm changes before deploy [Y/n]: y
	#SAM needs permission to be able to create roles to connect to the resources in your template
	Allow SAM CLI IAM role creation [Y/n]: y
	#Preserves the state of previously provisioned resources when an operation fails
	Disable rollback [y/N]: n
	TokenFunction has no authentication. Is this okay? [y/N]: y

	#Found code signing configurations in your function definitions
	Do you want to sign your code? [Y/n]: n
	Save arguments to configuration file [Y/n]: y
	SAM configuration file [samconfig.toml]:
	SAM configuration environment [default]:
```

After saving the above arguments to the SAM configuration file (`samconfig.toml`), future deployments can be made without the `--guided` flag:
```shell
sam build --cached --beta-features && sam deploy --capabilities CAPABILITY_NAMED_IAM --stack-name <stack-name>
```

## Generate and Publish Signing Key Pair to S3
There is a helper Node.js script for generating an asymmetric key pair and uploading the keys to the S3 bucket. Once uploaded, the public key is available at `/.well-known/jwks.json`.

> For the following it is required to be logged into the ID Check `dev` or `build` AWS account and have deployed the stack.

```shell
cd jwks-helper-script
sh publish_keys_to_s3.sh <stack-name> <enviroment-name>
```
