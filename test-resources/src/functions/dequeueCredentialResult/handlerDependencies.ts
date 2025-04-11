import {
  DynamoDbAdapter,
  IDynamoDbAdapter,
  IDynamoDBConfig,
} from "../common/dynamoDbAdapter/dynamoDbAdapter";

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getCredentialResultRegistry: ({
    tableName,
    ttlInSeconds,
  }: IDynamoDBConfig) => IDynamoDbAdapter;
}

export const handlerDependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getCredentialResultRegistry: ({ tableName, ttlInSeconds }: IDynamoDBConfig) =>
    new DynamoDbAdapter({ tableName, ttlInSeconds }),
};
