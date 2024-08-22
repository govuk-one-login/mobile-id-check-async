# STS Mock 

## Overview
This stack manages the following resources needed for the STS mock API:
* a REST API and a Lambda function for the `/token` endpoint
* an S3 bucket for storing the private key and also storing and serving the public key (`/.well-known/jwks.json`)

## Pre-requisites
- AWS CLI
- Node.js v20
- npm

## Quickstart
### Installing dependencies
```bash
npm run install
```

## Testing
To run unit and infrastructure tests:

```bash
npm run test:unit
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
### Manual Deployment
To manually deploy changes made to the stack (i.e. resources or source code) to the `dev` AWS account, run the following command after assuming your credentials:
```shell
sam build --parallel --cached --beta-features
sam deploy --guided
```

After saving the arguments to the SAM configuration file (`samconfig.toml`), future deployments can be made without the `--guided` flag:
```shell
sam build --parallel --cached --beta-features && sam deploy --capabilities CAPABILITY_NAMED_IAM --stack-name sts-mock-ah     
```

## Generate and Publish Signing Key Pair to S3
There is a helper Node.js script for generating an asymmetric key pair and uploading the keys to the S3 bucket. Once uploaded, the public key is available at `/.well-known/jwks.json`.

> For the following it is required to be logged into the ID Check `dev` or `build` AWS account and have deployed the stack.

```shell
cd jwks-helper-script
sh publish_keys_to_s3.sh <stack-name>
```
