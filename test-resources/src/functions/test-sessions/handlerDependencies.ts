export type ITestSessionsDependencies = {
  env: NodeJS.ProcessEnv;
};

export const runtimeDependencies: ITestSessionsDependencies = {
  env: process.env,
};
