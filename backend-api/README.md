# Backend API

## Status summary

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mobile-id-check-async&metric=alert_status&token=2b3ffa4269d7a6f80ff97e936fea21a45f10dd33)](https://sonarcloud.io/summary/new_code?id=mobile-id-check-async)

[![Async-credential Push to Main](https://github.com/govuk-one-login/mobile-id-check-async/actions/workflows/backend-api-push-to-main.yml/badge.svg)](https://github.com/govuk-one-login/mobile-id-check-async/actions/workflows/backend-api-push-to-main.yml)

## Dependencies

- AWS CLI
- AWS SAM
- Node.js v20
- npm

## Setup

This repository uses Githooks to run pre-commit checks. To install these:

```bash
git config --local core.hooksPath .github/hook-scripts
```

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
npm run deploy-backend-to-dev <your-stack-name>
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

This section acts as a technical reference. There are three logical components in this SAM application (mob-async-backend). All the infrastructure is defined in the template.yaml:

1) Private API
2) Proxy API
3) Regional API

This infrastructure is deployed via a Github action post-merge workflow and uploaded to S3 in the AWS Dev and Build accounts. This is then deployed via CodePipeline following the [Dev Platform methodology](https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3052077059/Secure+Delivery+Pipelines).

### Private API

#### Overview

This implements the [Client Credentials oauth grant flow]([https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow). Further internal reference documentation is [available on Confluence](https://govukverify.atlassian.net/wiki/spaces/DCMAW/pages/4439605366/Create+Session+-+Reference)

There are two API endpoints that provide this functionality:

POST async/token -> This endpoint is protected through the use of base encoded client credentials. This generates an access token scoped for this service. The access token is signed using a KMS signing key. The access token can be used for one or many sessions

POST async/credential -> This endpoint is protected through the use of an access token (generated through the POST /token request). It provisions an ID Check session in the backend database for a given subject identifier.

This is an AWS API with Private endpoint configuration, therefore it is only accessible from within an AWS VPC.

#### Client Registry

This stores the client credentials available and registered for use to access this service. The schema for this service [is available here](https://govukverify.atlassian.net/wiki/spaces/DCMAW/pages/3917447301/Strategic+App+DCMAW-7690+Implementing+Client+Credentials+Grant+Flow+and+Asynchronous+CRI+credential+requests#Systems-Manager-Parameter-Store---Client-Credentials-SecureString). This registry is stored in AWS Secrets Manager in each AWS environment.

The client credentials are used to access the POST /token endpoint

### Proxy API

#### Overview

This is a mock service to enable testing of the Private API in lower environments for developers running tests outside of an AWS VPC.

This is an AWS API with a Regional endpoint configuration, therefore it is accessible from any device.

It is protected with [AWS Signature V4](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-signing.html).

There are two API endpoints exposed:

POST async/token -> This proxies requests via a lambda to the POST async/token endpoint on the Private API

POST async/credential -> This proxies requests via a lambda to the POST async/credential endpoint on the Private API

Given both endpoints in the Private API require an Authorization header and AWS Signature v4 overwrites the Authorization header, the lambda maps a `x-custom-auth` header onto the `Authorization` header for the requests to the Private API before making Axios requests to the Private API.

#### Open API schema

This schema is generated dynamically from the async-private-spec.yaml. This is to ensure that the endpoints on the proxy are as similar as possible to the Private API and is kept up-to-date.

This schema is generated in the backend-api-push-to-main.yaml workflow. To generate it locally:

```bash
npm run generate-proxy-open-api
```

### Regional API

#### Overview

There are 4 API endpoints exposed:

GET async/.well-known/jwks.json -> Used to retrieve ID Check encryption public keys in JWKS format

GET async/activeSession -> Queries the session database to find an active session for a given user. If an active session is found it returns the sessionId, and redirectUri if present, in response. This endpoint will be consumed by the mobile app to retrieve the newest session.

POST async/biometricToken -> Retrieves a biometric access token for the document selected by the user. This endpoint is currently under development and not yet fully implemented.

POST async/finishBiometricSession -> App signifies to backend that user interaction for biometric session is complete. Development has not yet begun for this endpoint.
