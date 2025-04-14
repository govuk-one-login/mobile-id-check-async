import {
  DequeueDynamoDbAdapter,
  IDynamoDBConfig,
  IDequeueDynamoDbAdapter,
} from "../common/dequeueDynamoDBAdapter/dequeueDynamoDbAdapter";

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getCredentialResultRegistry: ({
    tableName,
  }: IDynamoDBConfig) => IDequeueDynamoDbAdapter;
}

export const handlerDependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getCredentialResultRegistry: ({ tableName }: IDynamoDBConfig) =>
    new DequeueDynamoDbAdapter({ tableName }),
};
