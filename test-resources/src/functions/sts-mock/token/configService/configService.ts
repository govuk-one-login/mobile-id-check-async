import {
  errorResult,
  Result,
  successResult,
} from "../../../common/utils/result";

export interface Config {
  STS_MOCK_BASE_URL: string;
  ASYNC_BACKEND_BASE_URL: string;
  KEY_STORAGE_BUCKET_NAME: string;
}

export interface IGetConfig<T> {
  getConfig: (env: NodeJS.ProcessEnv) => Result<T>;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.STS_MOCK_BASE_URL)
      return errorResult({
        errorMessage: "No STS_MOCK_BASE_URL",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.ASYNC_BACKEND_BASE_URL)
      return errorResult({
        errorMessage: "No ASYNC_BACKEND_BASE_URL",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.KEY_STORAGE_BUCKET_NAME)
      return errorResult({
        errorMessage: "No KEY_STORAGE_BUCKET_NAME",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      STS_MOCK_BASE_URL: env.STS_MOCK_BASE_URL,
      ASYNC_BACKEND_BASE_URL: env.ASYNC_BACKEND_BASE_URL,
      KEY_STORAGE_BUCKET_NAME: env.KEY_STORAGE_BUCKET_NAME,
    });
  };
}
