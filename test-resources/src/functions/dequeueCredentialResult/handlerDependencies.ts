import {
  DequeueDynamoDbAdapter,
  IDequeueDynamoDbAdapter,
} from "../common/dequeueDynamoDbAdapter/dequeueDynamoDbAdapter";

export interface IDequeueCredentialResultDependencies {
  env: NodeJS.ProcessEnv;
  getCredentialResultRegistry: (tableName: string) => IDequeueDynamoDbAdapter;
}

export const handlerDependencies: IDequeueCredentialResultDependencies = {
  env: process.env,
  getCredentialResultRegistry: (tableName: string) =>
    new DequeueDynamoDbAdapter(tableName),
};
