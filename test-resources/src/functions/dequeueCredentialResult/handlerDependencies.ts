import {
  DynamoDbAdapter,
  IDynamoDBConfig,
  IDynamoDbAdapter,
} from "../common/dynamoDBAdapter/dynamoDbAdapter";

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getCredentialResultRegistry: ({
    tableName,
  }: IDynamoDBConfig) => IDynamoDbAdapter;
}

export const handlerDependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getCredentialResultRegistry: ({ tableName }: IDynamoDBConfig) =>
    new DynamoDbAdapter({ tableName }),
};
