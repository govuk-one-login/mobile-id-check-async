# One Login Async Credential Service
This is the backend service supporting the asyncronous journey within the One Login application.

It follows the Client credentials grant flow from the OAuth2.0 Framework [see here for reference docs](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4).


## Dependencies:
- AWS CLI
- AWS SAM
- node v.20
- npm

## Running tests

To run unit tests:

```bash
npm run test
```

## Formatting

This repository uses Prettier as an opinionated formatter to ensure code style is consistent.

To format your code:
```bash
npm run format
```

To validate your code adheres to the formatting rules:
```bash
npm run format:check
```

## Linting

To lint your code:
```bash
npm run lint
```