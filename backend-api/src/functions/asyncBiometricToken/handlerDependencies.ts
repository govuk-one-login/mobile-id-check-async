import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/getSecretsFromParameterStore";

export type IAsyncBiometricTokenDependencies = {
  getSecrets: GetSecrets;
};

export const dependencies: IAsyncBiometricTokenDependencies = {
  getSecrets: getSecretsFromParameterStore,
};
