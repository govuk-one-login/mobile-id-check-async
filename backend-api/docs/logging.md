# Logging

Our logs are written using the Logger provided by 
[Powertools for AWS Lambda](https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/).

This library is used to write logs in a structured JSON format, so that they can be more easily parsed and queried.

## Log Messages

Log messages are defined at `backend-api/src/functions/common/logging/LogMessage.ts`. Each log message must have
the following fields defined:
* `messageCode` - a concise, machine-readable identifier for the message that can be used for querying and filtering our 
logs, e.g. `MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE`
* `message` - a human-readable description of what has occurred, e.g. `Failed to retrieve one or more secrets from SSM Parameter Store.`


## Using the Logger

A single instance of the Logger is created in `backend-api/src/functions/common/logging/logger.ts` and exported
for use across the different modules in our Lambda functions.

To log a message, import this instance and call the relevant method (`.info`/`.debug`/`.error`) according to the
severity of the event being logged, passing in a log message (see above) and, optionally, an object containing
additional fields and values to be logged. e.g.

```typescript
logger.error(LogMessage.GET_SECRETS_FROM_PARAMETER_STORE_FAILURE, {
    data: {
        "key": "value"
    }
})
```

## Persistent Attributes

Logging fields that should persist across multiple uses of the logger within a single Lambda invocation can be added as follows:

```typescript
logger.appendKeys({
    key: value
})
```

As a single logger instance is shared across the modules of our Lambda, these keys will persist until cleared or
overwritten. Request-specific keys should be cleared at the start of each request by calling `logger.resetKeys()` 
or calling the `setupLoggerForNewInvocation()` utility, which will invoke the former.

## Log Levels

The log level for all of our Lambda functions is configured using the `Globals.Function.LoggingConfig` in our
`template.yaml`. Currently, the log level is set to DEBUG in our dev environment, and INFO in every other environment.
This means that only logs with a level of DEBUG or above will be visible in dev, and only INFO or above in all other
environments.

Most of our informational logs - such as logs for the attempt and success of each network call - are logged at debug 
level. This will make it easier to debug issues where they can be reproduced in dev (which is most of the time), without
emitting too many redundant logs to CloudWatch in higher environments. If more information is needed to debug a 
recurring issue that surfaces only in higher environments, a specific log message can be escalated to INFO level for a
time following our normal release process.

Typically, the only non-error logs emitted at INFO level are the 'STARTED' and 'COMPLETED' logs for each Lambda function,
which allow us to easily track successful vs unsuccessful function completions.

For more information on configuring Lambda logs, see the [official documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html).

## Personally Identifiable Information

Personally identifiable information (PII) is any information that can be used to identify an individual, either alone 
or when combined with other information. We should be careful to **never log PII**, even at debug level, and to never
allow code that could log PII into version control.

## Viewing Logs

Our Lambda logs will be shipped to an AWS CloudWatch Log Group with the name `/aws/lambda/{name-of-lambda-function}`.

CloudWatch Logs Insights is a useful tool for querying and filtering logs from one or more log groups, particularly
when they follow a JSON structure.

For example, the following query will return the past 20 instances of a parameter store call failure with timestamp, 
message and message code:

```
fields @timestamp, message, messageCode
| filter messageCode = 'MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE'
| sort @timestamp desc
| limit 20
```

## Testing Logs

Unit tests for log messages can be achieved using our custom matcher (defined in `backend-api/src/functions/testUtils/matchers.ts`).

First, we must set the environment variable `POWERTOOLS_DEV` to `true`, which will ensure that Lambda Powertools uses the global console to emit logs. This is done in `jest.config.ts`.
Next, we must spy on the relevant method (`info`, `error`, etc) of the global console object, so we can track calls made to it.

```typescript
let consoleErrorSpy: jest.SpyInstance

beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error')
});
```

Finally, in our tests, we can use the custom matcher to assert that certain fields are or are not present in the logs:

```typescript
expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
    messageCode: 'MOBILE_ASYNC_EXPECTED_CODE',
})
expect(consoleErrorSpy).not.toHaveBeenCalledWithLogFields({
    messageCode: 'MOBILE_ASYNC_UNWANTED_CODE',
})

```

In any jest test file where we need to make log assertions, we must import the following:

```
import {expect} from "@jest/globals";
import 'dotenv/config'
import 'relative/path/to/testUtils/matchers'
```
