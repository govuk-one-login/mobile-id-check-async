# Backend API

## Status summary

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mobile-id-check-async&metric=alert_status&token=2b3ffa4269d7a6f80ff97e936fea21a45f10dd33)](https://sonarcloud.io/summary/new_code?id=mobile-id-check-async)

[![Async-credential Push to Main](https://github.com/govuk-one-login/mobile-id-check-async/actions/workflows/backend-api-push-to-main.yml/badge.svg)](https://github.com/govuk-one-login/mobile-id-check-async/actions/workflows/backend-api-push-to-main.yml)


## Dependencies

- AWS CLI
- AWS SAM
- Node.js v22
- npm
- rain v1.15

## Setup

This repository uses Githooks to run pre-commit checks. To install these:

```bash
git config --local core.hooksPath .github/hook-scripts
```
## Cloudformation Template
All infrastructure is written as code using Cloudformation. The `template.yaml` contains the infrastructure that is deployed to AWS. 

For readability, infrastructure is written in smaller `*.yaml` files, which are joined together to form the `template.yaml`. Do not update the `template.yaml` directly as this is automatically generated.

For guidance on adding, updating or removing infrastructure, see the[ infra/README.md](./infra/README.md)

## Running tests

### Unit, infra and pact tests

```bash
# From /backend-api
npm run test
```

### API tests

1. Activate AWS credentials
2. Deploy your stack
```bash
# From /backend-api
npm deploy:dev <your-stack-name>
```
Note: For more information, see `helper-scripts` [README](../helper-scripts/README.md#deploy_backend.sh))
3. The deployment script will generate you a `.env` file for your stack. To generate a `.env` for another deployed stack
```bash
# From /backend-api
sh generate_env_file.sh <stack_name>
```
4. Run tests
```bash
# From /backend-api
npm run test:api
```

## Formatting

This repository uses Prettier as an opinionated formatter to ensure code style is consistent.

To format your code:

```bash
# From /backend-api
npm run format
```

To validate your code adheres to the formatting rules:

```bash
# From /backend-api
npm run format:check
```

## Linting

To lint your code:

```bash
# From /backend-api
npm run lint
```

## Logging

See [here](docs/logging.md)

## Reference Guide

This section acts as a techhnical reference. There are three logical components in this SAM application (mob-async-backend). All the infrastructure is defined in the template.yaml:
1) Private API
2) Proxy API
3) Regional API

This infrastructure is deployed via a Github action post-merge worfklow and uploaded to S3 in the AWS Dev and Build accounts. This is then deployed via CodePipeline following the [Dev Platform methodology](https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3052077059/Secure+Delivery+Pipelines).

### Private API

#### Overview

This implements the [Client Credentials oauth grant flow]([https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow). Further internal reference documentation is [available on Confluence](https://govukverify.atlassian.net/wiki/spaces/DCMAW/pages/4439605366/Create+Session+-+Reference)

There are two API endpoints that provide this functionality:

POST async/token -> This endpoint is protected through the use of base encoded client credentials. This generates an access token scoped for this service. The access token is signed using a KMS signing key. The access token can be used for one or many sessions

POST async/credential -> This endpoint is protected through the use of an access token (generated through the POST /token request). It provisions an ID Check session in the backend database for a given subject identifier. 

This is an AWS API with Private endpoint configuration, therefore it is only accessibile from within an AWS VPC.

#### Client Registry

This stores the client credentials available and registered for use to access this service. The schema for this service [is available here](https://govukverify.atlassian.net/wiki/spaces/DCMAW/pages/3917447301/Strategic+App+DCMAW-7690+Implementing+Client+Credentials+Grant+Flow+and+Asynchronous+CRI+credential+requests#Systems-Manager-Parameter-Store---Client-Credentials-SecureString). This registry is stored in AWS Secrets Manager in each AWS environment.

The client credentials are used to access the POST /token endpoint

### Proxy API

#### Overview

This is a mock service to enable testing of the Private API in lower environments for developers running tests outside of an AWS VPC.

This is an AWS API with a Regional endpoint configuration, therefore it is accessible from any device. 

It is protected with [AWS Signature V4](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-signing.html).

There are two API endpoints exposed:

POST async/token -> This proxies requests via a lambda to the POST aync/token endpoint on the Private API

POST async/credential -> This proxies requests via a lambda to the POST aync/credential endpoint on the Private API

Given both endpoints in the Private API require an Authorization header and AWS Signature v4 overwrites the Authorization header, the lambda maps a `x-custom-auth` header onto the `Authorization` header for the requests to the Private API before making Axios requests to the Private API.

#### Open API schema

This schema is generated dynamically from the async-private-spec.yaml. This is to ensure that the endpoints on the proxy are as similar as possible to the Private API and is kept up-to-date.

This schema is generated in the backend-api-push-to-main.yaml worfklow. To generate it locally:

```bash
npm run generate-proxy-open-api
```

#### JSON Web Keys

The `/.well-known/jwks.json` endpoint serves the JSON Web Keys Set object. This object contains information about the ID Check encryption key, and the verifiable credential signing key. These are used by STS for encrypting the service token sent to the `GET /async/activeSession` endpoint in the Authorization header, and signing the biometric credential before being sent to the IPVCore Outbound SQS. The encryption algorithm is `RSA-OAEP-256`, and the signing alsorithm is `ECC_NIST_P256`, see [STS technical design](https://govukverify.atlassian.net/wiki/spaces/DCMAW/pages/3844964353/Strategic+App+App+calls+a+protected+service) for the public key requirements.

The encryption and signing keys are created in AWS KMS. The infrastructure code lives in `./infra/kms/keys.yaml`.

The JSON Web Keys Set object is stored in AWS S3. The `/.well-known/jwks.json` endpoint retrieves the object from S3 via an AWS service integration. Note, this integration can occasionally return a 5XX error due to the distributed nature of AWS and consumers should be advised to retry in this scenario.

The JSON Web Keys Set object is created when the stack is deployed for the first time. A Cloudformation custom resource sends a notification to the jwksHandler and this invokes the lambda. The lambda builds the JSON Web Keys Set object and uploads it to S3.

Note: for redeployments of the application, the jwksWebKeys lambda is only invoked when the resource in the template.yaml is updated. By default the lambda is not updated when the lambda handler code is updated. To facilitate automatic updates of the lambda in this scenario, a parameter has been added to the Cloudformation template containing the lambda version arn. This version arn updates when the lambda handler code is changed, causing an invocation of the lambda.