import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/getSecretsFromParameterStore";

export type IAsyncBiometricTokenDependencies = {
  env: NodeJS.ProcessEnv;
  getSecrets: GetSecrets;
};

export const runtimeDependencies: IAsyncBiometricTokenDependencies = {
  env: process.env,
  getSecrets: getSecretsFromParameterStore,
};
