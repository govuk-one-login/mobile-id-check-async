import { Result } from "../utils/result";

export interface IGetConfig<T> {
  getConfig: (env: NodeJS.ProcessEnv) => Result<T>;
}
