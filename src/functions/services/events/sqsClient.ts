import { SQSClient } from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export const sqsClient = new SQSClient({
  region: process.env.REGION,
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 29000,
    requestTimeout: 29000,
  }),
});
