import { KMSClient } from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export const kmsClient = new KMSClient({
  region: "eu-west-2",
  requestHandler: new NodeHttpHandler({
    requestTimeout: 29000,
    connectionTimeout: 5000,
  }),
  maxAttempts: 3,
});
