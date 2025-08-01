# How to update TxMA test harness when new events are being developed

This guide provides the steps for updating the async test harness to process new
TxMA events being developed in the async backend.

### 1. Update the allowed events in the Dequeue Lambda

Update the `allowedTxmaEventNames` array in
[`getEvents`](../../test-resources/src/functions/dequeueEvents/getEvent.ts) to include
the new TxMA event being developed.

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

1. Write the event to the TxMA SQS by triggering the Lambda that sends the
event. Alternatively, directly add a message to the TxMA SQS.

1. Make a request to the `/events` endpoint on the test-resources API to
validate the event has been correctly dequeued and present in DynamoDB.

###### Example event sent to TxMA SQS

```typescript
{
  "user": {
    "user_id": "mockSubjectIdentifier",
    "session_id": "mockSessionId",
    "ip_address": "mockUserIpAddress",
    "govuk_signin_journey_id": "mockJourneyId"
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

The test-resources API requires Signature V4 headers as it uses `IAM_AUTH` authorization.
This can be done with a combination of `axios` and `aws4-axios` npm packages.

```typescript
import axios from "axios";
import { aws4Interceptor } from "aws4-axios";

const apiInstance = axios.create({ baseURL: "API URL" });

const interceptor = aws4Interceptor({
  options: {
    region: "eu-west-2",
    service: "execute-api",
  },
  credentials: {
    getCredentials: fromNodeProviderChain({
      timeout: 1000,
      maxRetries: 1,
      profile: process.env.AWS_PROFILE,
    }),
  },
});

apiInstance.interceptors.request.use(interceptor);

const params = {
  pkPrefix: `SESSION%23mockSessionId`,
  skPrefix: `TXMA%23EVENT_NAME%DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED`,
};

const response = await apiInstance.get("/events", {
  params,
});
```
> Given this an asynchronous flow, the user may need to poll this endpoint
until the event has been dequeued.