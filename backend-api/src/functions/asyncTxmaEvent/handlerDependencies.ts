export type IAsyncTxmaEventDependencies = {
  env: NodeJS.ProcessEnv;
};

export const runtimeDependencies: IAsyncTxmaEventDependencies = {
  env: process.env,
};
