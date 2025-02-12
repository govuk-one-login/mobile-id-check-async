export type IAsyncFinishBiometricSessionDependencies = {
  env: NodeJS.ProcessEnv;
};

export const runtimeDependencies: IAsyncFinishBiometricSessionDependencies = {
  env: process.env,
};
