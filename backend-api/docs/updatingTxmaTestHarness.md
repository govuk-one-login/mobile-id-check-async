# How to update TxMA test harness when new events are being developed

This guide provides the steps for updating the async test harness to process new TxMA events being developed in the async backend.

## Process

### 1. Update the allowed events in the Dequeue Lambda

Update the [`getEvents`](../../test-resources/src/functions/dequeue/getEvent.ts)
file to include the new TxMA event name.

###### Example

```typescript
export const allowedTxmaEventNames = [
  "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
  "DCMAW_ASYNC_CRI_START",
  "DCMAW_ASYNC_CRI_4XXERROR",
  "DCMAW_ASYNC_CRI_5XXERROR",
  "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
  "DCMAW_ASYNC_NEW_TXMA_EVENT_NAME",
];
```

### 2. Test the event is being dequeued correctly

1. Write the event to SQS by triggering the Lambda that sends the event.

1. Make a request to the `/events` API to validate the event has been
correctly dequeued and present in DynamoDB.

###### Example event sent to TxMA SQS

```typescript
{
  "user": {
    "user_id": "the subject identifier",
    "session_id": "mockSessionId",
    "ip_address": "$.user.ip_address",
    "govuk_signin_journey_id": "the journey ID passed in from Auth/IPV Core"
  },
  "timestamp": 1234567890,
  "event_timestamp_ms": 1234567890000,
  "event_name": "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
  "component_id": "https://sessions-mob-async-backend.review-b-async.account.gov.uk",
  "extensions":{
    "documentType": "NFC_PASSPORT"
  },
}
```


###### Example request to the `/events` endpoint

```typescript
const params = {
  pkPrefix: `SESSION%23mockSessionId`,
  skPrefix: `TXMA%23EVENT_NAME%DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED`,
};

const response = await EVENTS_API_INSTANCE.get("/events", {
  params,
});
```
