export type IAsyncAbortSessionDependencies = {
  env: NodeJS.ProcessEnv;
};

export const runtimeDependencies: IAsyncAbortSessionDependencies = {
  env: process.env,
};
