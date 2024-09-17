import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  MOCK_STS_BASE_URL: string;
  KEY_STORAGE_BUCKET: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.MOCK_STS_BASE_URL)
      return errorResult({
        errorMessage: "No MOCK_STS_BASE_URL",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.KEY_STORAGE_BUCKET)
      return errorResult({
        errorMessage: "No KEY_STORAGE_BUCKET",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      MOCK_STS_BASE_URL: env.MOCK_STS_BASE_URL,
      KEY_STORAGE_BUCKET: env.KEY_STORAGE_BUCKET,
    });
  };
}
