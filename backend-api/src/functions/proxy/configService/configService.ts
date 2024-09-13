import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  PRIVATE_API_URL: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.PRIVATE_API_URL)
      return errorResult({
        errorMessage: "No PRIVATE_API_URL",
        errorCategory: "SERVER_ERROR",
      });
    return successResult({
      PRIVATE_API_URL: env.PRIVATE_API_URL,
    });
  };
}
