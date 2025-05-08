import { KMSClient } from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export const kmsClient = new KMSClient({
  region: "eu-west-2",
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});
