import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/getSecretsFromParameterStore";
import {
  getBiometricToken,
  GetBiometricToken,
} from "./getBiometricToken/getBiometricToken";

export type IAsyncBiometricTokenDependencies = {
  env: NodeJS.ProcessEnv;
  getSecrets: GetSecrets;
  getBiometricToken: GetBiometricToken;
};

export const runtimeDependencies: IAsyncBiometricTokenDependencies = {
  env: process.env,
  getSecrets: getSecretsFromParameterStore,
  getBiometricToken: getBiometricToken,
};
