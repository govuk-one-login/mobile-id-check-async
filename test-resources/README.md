# Test Resources

## Pre-requisites
- Node.js v20
- npm
- AWS CLI
- AWS SAM

## Resources

### Dequeue

#### Description

This test resource checks that messages sent from the Async Backend API are successfully received by the provisioned SQS queue.

#### Testing

##### How to run unit tests:

```sh
> npm run test:unit
```

#### Deployment

##### How to deploy a custom stack:

```sh
> npm run deploy <stack-name> <optional-custom-backend-stack-name>
```

> Note: the `<stack-name>` you enter will be appended with `-test-resources`. If you do not provide a custom backend stack name, it will default to the main backend stack name in dev (`mob-async-backend`).

---
