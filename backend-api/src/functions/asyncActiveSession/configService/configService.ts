import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  ENCRYPTION_KEY_ARN: string;
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

    if (!env.STS_JWKS_ENDPOINT) {
      return errorResult({
        errorMessage: "No STS_JWKS_ENDPOINT",
        errorCategory: "SERVER_ERROR",
      });
    }
    try {
      new URL(env.STS_JWKS_ENDPOINT);
    } catch {
      return errorResult({
        errorMessage: "STS_JWKS_ENDPOINT is not a URL",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult({
      ENCRYPTION_KEY_ARN: env.ENCRYPTION_KEY_ARN,
      STS_JWKS_ENDPOINT: env.STS_JWKS_ENDPOINT,
    });
  };
}
