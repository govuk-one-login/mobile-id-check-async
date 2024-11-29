# Test Resources

## Pre-requisites
- Node.js v20
- npm
- AWS CLI
- AWS SAM

## Resources

### Test Dequeue

#### Description

This test resource checks that messages sent from the Async Backend API are successfully received by the provisioned SQS queue.

#### Testing

##### How to run unit tests:

```sh
> npm run test:dequeue
```

#### Deployment

##### How to deploy a custom stack:

```sh
> npm run deploy-test-resources-to-dev <stack-name>
```

> Note: the stack you enter will be appended with `-test-resources`.

---
