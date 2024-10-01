import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  ENCRYPTION_KEY_ARN: string;
  STS_JWKS_ENDPOINT: string;
  STS_JWKS_ENDPOINT_RETRY_DELAY_IN_MS: number;
  STS_JWKS_ENDPOINT_MAX_ATTEMPTS: number;
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

    if (!env.STS_JWKS_ENDPOINT_RETRY_DELAY_IN_MS) {
      return errorResult({
        errorMessage: "No STS_JWKS_ENDPOINT_RETRY_DELAY_IN_MS",
        errorCategory: "SERVER_ERROR",
      });
    }
    if (!env.STS_JWKS_ENDPOINT_MAX_ATTEMPTS) {
      return errorResult({
        errorMessage: "No STS_JWKS_ENDPOINT_MAX_ATTEMPTS",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult({
      ENCRYPTION_KEY_ARN: env.ENCRYPTION_KEY_ARN,
      STS_JWKS_ENDPOINT: env.STS_JWKS_ENDPOINT,
      STS_JWKS_ENDPOINT_RETRY_DELAY_IN_MS: parseInt(
        env.STS_JWKS_ENDPOINT_RETRY_DELAY_IN_MS,
      ),
      STS_JWKS_ENDPOINT_MAX_ATTEMPTS: parseInt(
        env.STS_JWKS_ENDPOINT_MAX_ATTEMPTS,
      ),
    });
  };
}
