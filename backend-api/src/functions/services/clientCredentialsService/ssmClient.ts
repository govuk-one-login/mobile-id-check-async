import { SSMClient } from "@aws-sdk/client-ssm";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

export const ssmClient = new SSMClient({
  region: process.env.REGION,
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 29000,
    requestTimeout: 29000,
  }),
});
