import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  ASYNC_BACKEND_API_URL: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.ASYNC_BACKEND_API_URL)
      return errorResult({
        errorMessage: "No ASYNC_BACKEND_API_URL",
        errorCategory: "SERVER_ERROR",
      });
    return successResult({
      ASYNC_BACKEND_API_URL: env.ASYNC_BACKEND_API_URL,
    });
  };
}
