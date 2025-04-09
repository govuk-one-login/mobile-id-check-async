import { DynamoDbAdapter } from "../adapters/aws/dynamo/dynamoDbAdapter";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";

export type IssueBiometricCredentialDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
};

export const runtimeDependencies: IssueBiometricCredentialDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
};
