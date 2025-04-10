import {
  DynamoDBAdapter,
  IDynamoDBConfig,
} from "../common/dynamoDBAdapter/dynamoDBAdapter";
import { ICredentialResultRegistry } from "./credentialResultRegistry/credentialResultRegistry";

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getCredentialResultRegistry: ({
    tableName,
    ttlInSeconds,
  }: IDynamoDBConfig) => ICredentialResultRegistry;
}

export const handlerDependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getCredentialResultRegistry: ({ tableName, ttlInSeconds }: IDynamoDBConfig) =>
    new DynamoDBAdapter({ tableName, ttlInSeconds }),
};
