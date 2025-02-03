# Test Resources

## Pre-requisites
- Node.js v20
- npm
- AWS CLI
- AWS SAM

## Resources

- [STS mock](src/functions/sts-mock/README.md)
- [Dequeue events](src/functions/dequeue/README.md)


## Formatting

To format your code:
```bash
npm run format
```

To check your code adheres to the formatting rules:
```bash
npm run format:check
```

## Testing

#### How to run unit tests:

```sh
> npm run test:unit
```

## Deployment

#### How to deploy a custom stack:

```sh
> npm run deploy <stack-name>
```

> Note: `-test-resources` will be appended to the given `<stack-name>`.