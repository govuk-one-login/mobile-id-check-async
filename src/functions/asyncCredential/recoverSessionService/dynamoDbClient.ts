import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const config: DynamoDBClientConfig = {
  //TODO: Get region dynamically
  region: "eu-west-2",
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 29000,
    requestTimeout: 29000,
  }),
};

//TODO: Check if we are using X-ray
export const dbClient = new DynamoDBClient(config);
