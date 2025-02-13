# How to add new TxMA events to the Async Backend

This guide provides steps for adding a new TxMA event to the Async Backend to
ensure it is registered, added to the correct files, and is available for
testing.

## Process

### 1. Register event

Follow this guide to register an new TxMA event:

https://github.com/govuk-one-login/event-catalogue/blob/main/README.md

### 2. Update Dequeue validation

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

### 3. Write an API test

