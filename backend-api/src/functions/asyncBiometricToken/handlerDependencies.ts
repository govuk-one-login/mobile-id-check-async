import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/getSecretsFromParameterStore";
import {
  getBiometricToken,
  GetBiometricToken,
} from "./getBiometricToken/getBiometricToken";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { DynamoDbAdapter } from "../adapters/dynamoDbAdapter";

export type IAsyncBiometricTokenDependencies = {
  env: NodeJS.ProcessEnv;
  getSecrets: GetSecrets;
  getBiometricToken: GetBiometricToken;
  getSessionRegistry: (tableName: string) => SessionRegistry;
};

export const runtimeDependencies: IAsyncBiometricTokenDependencies = {
  env: process.env,
  getSecrets: getSecretsFromParameterStore,
  getBiometricToken,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
};
