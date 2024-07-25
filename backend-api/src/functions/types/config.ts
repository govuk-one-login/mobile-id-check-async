import { Result } from "./result";

export interface IGetConfig<T> {
  getConfig: (env: NodeJS.ProcessEnv) => Result<T>;
}
