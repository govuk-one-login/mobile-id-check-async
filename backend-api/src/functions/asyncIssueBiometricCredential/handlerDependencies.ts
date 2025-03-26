export type IssueBiometricCredentialDependencies = {
  env: NodeJS.ProcessEnv;
};

export const runtimeDependencies: IssueBiometricCredentialDependencies = {
  env: process.env,
};
