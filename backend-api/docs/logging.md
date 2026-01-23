# Logging

Our logs are written using the Logger provided by
[Powertools for AWS Lambda](https://docs.aws.amazon.com/powertools/typescript/latest/features/logger/).
This library is used to write logs in a structured JSON format, so that they can be more easily parsed and queried.

## Log Messages

Log messages are defined at `backend-api/src/functions/common/logging/LogMessage.ts`. Each log message must have
the following fields defined:

- `messageCode` - a concise, machine-readable identifier for the message that can be used for querying and filtering our
  logs, e.g. `MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE`
- `message` - a human-readable description of what has occurred, e.g. `Failed to retrieve one or more secrets from SSM Parameter Store.`

## Using the Logger

A single instance of the Logger is created in `backend-api/src/functions/common/logging/logger.ts` and exported
for use across the different modules in our Lambda functions.

To log a message, import this instance and call the relevant method (`.info`/`.debug`/`.error`) according to the
severity of the event being logged, passing in a log message (see above) and, optionally, an object containing
additional fields and values to be logged. e.g.

```ts
logger.error(LogMessage.GET_SECRETS_FROM_PARAMETER_STORE_FAILURE, {
  data: {
    key: "value",
  },
});
```

### Persistent Identifiers

To assist tracing user requests across the system to aide in support queries, we have decided to append the following identifiers to the logger as soon as we have access to them in the lambda handler:

| Identifier             | Origin                                                       | Purpose                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `biometricSessionId`   | In request from mobile app to `async/finishBiometricSession` | Identifies the `ReadID` session for biometric verification, useful for tracing errors encountered during VC issuance                                                 |
| `govukSigninJourneyId` | In request from IPV Core to `async/Credential`               | A correlation ID to trace a user's journey through One Login's identity proving, can be used for session lookup and tracing the user's ID Check asynchronous journey |

Logging fields that should persist across multiple uses of the logger within a single Lambda invocation can be added as follows:

```ts
import { appendPersistentIdentifiersToLogger } from "relative/path/to/logging/helpers/appendPersistentIdentifiersToLogger.ts";

const { biometricSessionId, govukSigninJourneyId } = sessionAttributes;
appendPersistentIdentifiersToLogger({
  biometricSessionId,
  govukSigninJourneyId,
});
```

Note that calling `appendPersistentIdentifiersToLogger()` will overwrite any existing identifiers; in other words, they cannot be written incrementally:

```ts
appendPersistentIdentifiersToLogger({ biometricSessionId });
appendPersistentIdentifiersToLogger({ govukSigninJourneyId });

// At this point, the logger will only have the identifier `govukSigninJourneyId` on it.
```

As a single logger instance is shared across the modules of our Lambda, these keys will persist until cleared or
overwritten. Request-specific keys should be cleared at the start of each Lambda invocation by calling `logger.resetKeys()`.

See [example log](#example-log) below to see how these persistent keys appear

## Rules and conventions for logging

### Log Levels

The log level for all of our Lambda functions is configured using the `Globals.Function.LoggingConfig` in our
`template.yaml`. Currently, the log level is set to DEBUG in our dev environment, and INFO in every other environment.
This means that only logs with a level of DEBUG or above will be visible in dev, and only INFO or above in all other
environments.

Most of our non-error logs - such as logs for the attempt and success of each network call - are logged at DEBUG
level. This will make it easier to debug issues where they can be reproduced in dev (which is most of the time), without
emitting too many redundant logs to CloudWatch in higher environments. If more information is needed to debug a
recurring issue that surfaces only in higher environments, a specific log message can be escalated to INFO level for a
time following our normal release process.

Typically, the only non-error logs emitted at INFO level are the 'STARTED' and 'COMPLETED' logs for each Lambda function,
which allow us to easily track successful vs unsuccessful function completions.

For more information on configuring Lambda logs, see the [official documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html).

### Personally Identifiable Information

Personally identifiable information (PII) is any information that can be used to identify an individual, either alone
or when combined with other information. We should be careful to **never log PII**, even at DEBUG level, and to never
allow code that could log PII into version control. We should avoid logging entire objects where possible, and take care
should we need to do so, as the object's keys could change to include PII over time without it being obvious that this
would surface in the logs.

### Standard log messages

- All Lambda functions must emit a `STARTED` log message at the start of processing, and a `COMPLETED`
  log
  message
  after successful completion of processing, to allow us to monitor the function's success or failure. Both should
  be at `INFO` level.

- Network calls - e.g. to AWS services via the SDKs, or directly to an HTTP API - should have `DEBUG` level logs for
  the attempt (made immediately before the network call) and success (made after the call returns successfully) of
  the operation, to allow us to debug issues with network calls. They should also have one or more `ERROR` level
  logs for each relevant failure mode (e.g. for an UpdateItem call to DynamoDB, we might have one error log for
  failed conditional checks, and another for all other errors).

## Viewing Logs

Our Lambda logs will be shipped to an AWS CloudWatch Log Group with the name `/aws/lambda/{name-of-lambda-function}`.

CloudWatch Logs Insights is a useful tool for querying and filtering logs from one or more log groups, particularly
when they follow a JSON structure.

For example, the following query will return the past 20 instances of a parameter store call failure with timestamp,
message and message code:

```text
fields @timestamp, message, messageCode
| filter messageCode = 'MOBILE_ASYNC_GET_SECRETS_FROM_PARAMETER_STORE_FAILURE'
| sort @timestamp desc
| limit 20
```

### Example log

```json
{
  "level": "INFO",
  "message": "Lambda handler processing has completed successfully.",
  "timestamp": "2025-05-07T14:37:38.553Z",
  "service": "mobile-id-check-async-backend",
  "cold_start": false,
  "function_arn": "arn:aws:lambda:eu-west-2:<account-number>:function:mob-async-backend-finish-biometric-session:live",
  "function_memory_size": "512",
  "function_name": "mob-async-backend-finish-biometric-session",
  "function_request_id": "11111111-1111-1111-1111-111111111111",
  "sampling_rate": 0,
  "xray_trace_id": "a-aaaaaaaa-aaaaaaaaaaaaaaaaaaaaaaaa",
  "functionVersion": "1",
  "persistentIdentifiers": {
    "biometricSessionId": "22222222-2222-2222-2222-222222222222",
    "govukSigninJourneyId": "33333333-3333-3333-3333-333333333333"
  },
  "messageCode": "MOBILE_ASYNC_FINISH_BIOMETRIC_SESSION_COMPLETED"
}
```

## Testing Logs

There is a custom matcher (defined in `backend-api/src/functions/testUtils/matchers.ts`) that can be used to facilitate unit testing log messages.

First, we must set the environment variable `POWERTOOLS_DEV` to `true`, which will ensure that Lambda Powertools uses the global console to emit logs. This is done in `jest.config.ts`.
Next, we must spy on the relevant method (`info`, `error`, etc) of the global console object, so we can track calls made to it.

```ts
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error");
});
```

Finally, in our tests, we can use the custom matcher to assert that certain fields are or are not present in the logs:

```ts
expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
  messageCode: "MOBILE_ASYNC_EXPECTED_CODE",
  persistentIdentifiers: {
    govukSigninJourneyId: mockGovukSigninJourneyId,
  },
});
expect(consoleErrorSpy).not.toHaveBeenCalledWithLogFields({
  messageCode: "MOBILE_ASYNC_UNWANTED_CODE",
});
```

In any jest test file where we need to make log assertions, we must import the following:

```ts
import { expect } from "@jest/globals";
import "relative/path/to/testUtils/matchers";
```
