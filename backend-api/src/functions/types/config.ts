import { ErrorOrSuccess } from "./errorOrValue";

export interface IGetConfig<T> {
  getConfig: (env: NodeJS.ProcessEnv) => ErrorOrSuccess<T>;
}
