# Dequeue events

## Contents
- [Overview](#overview)
- [Dependencies](#dependencies)
- [Flow](#flow)
- [How it works](#how-it-works)
    - [Backend API SQS queue](#backend-api-sqs-queue)
    - [Dequeue Lambda](#dequeue-lambda)
        - [Lambda invocation](#lambda-invocation)
        - [Processing events](#processing-events)
        - [Storing events in DynamoDB](#storing-events-in-dynamodb)
            - [Partition Key and Sort Key](#partition-key-and-sort-key)
        - [`BatchItemFailures`](#batchitemfailures)
        - [Visibility Timeout](#visibility-timeout)
    - [Log messages](#log-messages)

## Overview

The Dequeue Events functionality adds the ability to test two existing patterns
within the Async repo architecture that were previously not possible to test:

- TxMA audit events sent to SQS
-  Messages sent to the following during handback:
    - Vendor processing queue
    - Outbound queue for IPV


## Dependencies

- `aws-lambda`
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/util-dynamodb`
- `@smithy/node-http-handler`

## Flow

1. An event is sent to the TxMA event SQS queue
1. The Dequeue Lambda is triggered by SQS receiving the TxMA event
1. Events are processed by the Dequeue Lambda.
1. For each event processed, the Dequeue Lambda makes a call to DynamoDB saving
the event to the Events table.
1. Events successfully written to the Events table can then be retrieved using
the `/events` endpoint on the test-resources
[Events API](../../../openApiSpecs/events-spec.yaml)

## How it works

### Backend API SQS queue
---

The first step in the Dequeue events flow happens when a TxMA audit event is
sent to the backend-api SQS queue. This can be done manually in the AWS console
and by calling any Lambda, in a deployed backend-api stack, that pushes a TxMA
event to SQS.

Once events reach SQS, they are then pulled off of the queue by the Dequeue
Lambda to be processed.

### Dequeue Lambda
---

#### Lambda invocation

The Dequeue Lambda receives an event when a new event is added to the
backend-api SQS queue. This is done using an [`EventSourceMapping` AWS resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html).

#### Processing events

A new event is sent from the backend-api SQS queue to the Dequeue Lambda.
However, multiple TxMA events can be sent, in a `Records` array, by configuring
the `BatchSize` on the `EventSourceMapping` resource (an example can be found in
the [SAM template](../../../infra/dequeue/function.yaml)).

Each Record is processed individually with an initial check that logs if there
is an error retrieving the event from the Record. The Lambda will then skip to
the next event to be processed if there is one.

#### Storing events in DynamoDB

A valid event that has passed the previous check is then sent to the Events
table via a DynamoDB `PutItemCommand`. This call contains the following Item
schema:

```typescript
const putItemCommandInput: PutItemCommandInput = {
  TableName: env.EVENTS_TABLE_NAME,
  Item: marshall({
    pk: `SESSION#${sessionId}`,
    sk: `TXMA#EVENT_NAME#${eventName}#TIMESTAMP#${timestamp}`,
    event: record.body,
    timeToLiveInSeconds,
  }),
};
```

> ##### Partition Key and Sort Key
> The Partition Key (PK) and Sort Key (SK) make up the composite key use to
> query the Events table.


An error writing to DynamoDB results in a message being logged and the
`messageId` from the current record being pushed to a `batchItemFailures` array.

If storing the event in the Events table is successful, the `event_name` and
`session_id` from that event is pushed to a `processedMessages` array, which is
logged once all events have been processed.

#### `BatchItemFailures`

An object with `batchItemFailures`, if any, is returned from the Dequeue Lambda.
This puts events that failed to be written to DynamoDB back into the SQS queue
to be reprocessed.

Records being worked on by the Dequeue Lambda are considered 'in-fight' and
cannot be processed by other consumers of the backend-api SQS queue due to the
[visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html).

## Log messages

- `ENVIRONMENT_VARIABLE_MISSING`
- `FAILED_TO_PROCESS_MESSAGES`
- `ERROR_WRITING_EVENT_TO_EVENTS_TABLE`
- `PROCESSED_MESSAGES`
