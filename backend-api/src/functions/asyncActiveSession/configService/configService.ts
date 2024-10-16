import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  ENCRYPTION_KEY_ARN: string;
  SESSION_TABLE_NAME: string;
  ISSUER: string;
  STS_BASE_URL: string;
  STS_JWKS_ENDPOINT: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.ENCRYPTION_KEY_ARN) {
      return errorResult({
        errorMessage: "No ENCRYPTION_KEY_ARN",
        errorCategory: "SERVER_ERROR",
      });
    }
    if (!env.SESSION_TABLE_NAME) {
      return errorResult({
        errorMessage: "No SESSION_TABLE_NAME",
        errorCategory: "SERVER_ERROR",
      });
    }
    if (!env.ISSUER) {
      return errorResult({
        errorMessage: "No ISSUER",
        errorCategory: "SERVER_ERROR",
      });
    }
    if (!env.STS_BASE_URL) {
      return errorResult({
        errorMessage: "No STS_BASE_URL",
        errorCategory: "SERVER_ERROR",
      });
    }
    try {
      new URL(env.STS_BASE_URL);
    } catch {
      return errorResult({
        errorMessage: "STS_BASE_URL is not a URL",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult({
      ENCRYPTION_KEY_ARN: env.ENCRYPTION_KEY_ARN,
      SESSION_TABLE_NAME: env.SESSION_TABLE_NAME,
      STS_BASE_URL: env.STS_BASE_URL,
      STS_JWKS_ENDPOINT: env.STS_BASE_URL + "/.well-known/jwks.json",
      ISSUER: env.ISSUER,
    });
  };
}
