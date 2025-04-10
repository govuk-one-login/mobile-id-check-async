import { GetSecrets } from "../common/config/secrets";
import { getSecretsFromParameterStore } from "../adapters/aws/parameterStore/getSecretsFromParameterStore";

export type IssueBiometricCredentialDependencies = {
  env: NodeJS.ProcessEnv;
  getSecrets: GetSecrets;
};

export const runtimeDependencies: IssueBiometricCredentialDependencies = {
  env: process.env,
  getSecrets: getSecretsFromParameterStore,
};
