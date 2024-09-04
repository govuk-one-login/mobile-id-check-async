# One Login Async Credential Service

This is the backend service supporting the asyncronous journey within the One Login application.

It follows the Client credentials grant flow from the OAuth2.0 Framework [see here for reference docs](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4).

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
3. Generate a `.env` file for your deployed stack

```bash
# From /backend-api
sh generate_env_file.sh <stack_name> .env
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
