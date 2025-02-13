# How to add new TxMA events to the Async Backend

This guide shows you how to add a new TxMA event to the Async Backend.

There are a few steps you will need to follow to ensure new events are added
correctly and are available for testing.

## Process

### Register event

Follow this guide to register an new TxMA event:

https://github.com/govuk-one-login/event-catalogue/blob/main/README.md

### Update Dequeue validation

Once the event is registered, update the Dequeue Lambda validation by adding the
new event to the relevant array in the [`getEvents`](../../test-resources/src/functions/dequeue/getEvent.ts)
file - `allowedTxmaEventNames` or `allowedTxmaEventNamesWithoutSessionId`.

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

### Write an API test

