import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  ENCRYPTION_KEY_ID: string;
  JWKS_BUCKET_NAME: string;
  JWKS_FILE_NAME: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.ENCRYPTION_KEY_ID)
      return errorResult({
        errorMessage: "No ENCRYPTION_KEY_ID",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.JWKS_BUCKET_NAME)
      return errorResult({
        errorMessage: "No JWKS_BUCKET_NAME",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.JWKS_FILE_NAME)
      return errorResult({
        errorMessage: "No JWKS_FILE_NAME",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      ENCRYPTION_KEY_ID: env.ENCRYPTION_KEY_ID,
      JWKS_BUCKET_NAME: env.JWKS_BUCKET_NAME,
      JWKS_FILE_NAME: env.JWKS_FILE_NAME,
    });
  };
}
