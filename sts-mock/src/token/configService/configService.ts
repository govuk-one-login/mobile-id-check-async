import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  ENCRYPTION_KEY_ID: string;
  SIGNING_KEY_ID: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.ENCRYPTION_KEY_ID)
      return errorResult({
        errorMessage: "No ENCRYPTION_KEY_ID",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.SIGNING_KEY_ID)
      return errorResult({
        errorMessage: "No SIGNING_KEY_ID",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      ENCRYPTION_KEY_ID: env.ENCRYPTION_KEY_ID,
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
    });
  };
}
