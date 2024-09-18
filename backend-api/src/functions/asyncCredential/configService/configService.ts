import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  SIGNING_KEY_ID: string;
  ISSUER: string;
  SESSION_TABLE_NAME: string;
  SESSION_DURATION_IN_SECONDS: number;
  TXMA_SQS: string;
  CLIENT_REGISTRY_SECRET_NAME: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.SIGNING_KEY_ID)
      return errorResult({
        errorMessage: "No SIGNING_KEY_ID",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.ISSUER)
      return errorResult({
        errorMessage: "No ISSUER",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.SESSION_TABLE_NAME)
      return errorResult({
        errorMessage: "No SESSION_TABLE_NAME",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.SESSION_DURATION_IN_SECONDS)
      return errorResult({
        errorMessage: "No SESSION_DURATION_IN_SECONDS",
        errorCategory: "SERVER_ERROR",
      });
    if (isNaN(Number(env.SESSION_DURATION_IN_SECONDS)))
      return errorResult({
        errorMessage: "SESSION_DURATION_IN_SECONDS is not a valid number",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.TXMA_SQS)
      return errorResult({
        errorMessage: "No TXMA_SQS",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.CLIENT_REGISTRY_SECRET_NAME)
      return errorResult({
        errorMessage: "No CLIENT_REGISTRY_SECRET_NAME",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      ISSUER: env.ISSUER,
      SESSION_TABLE_NAME: env.SESSION_TABLE_NAME,
      SESSION_DURATION_IN_SECONDS: parseInt(
        env.SESSION_DURATION_IN_SECONDS,
      ),
      TXMA_SQS: env.TXMA_SQS,
      CLIENT_REGISTRY_SECRET_NAME: env.CLIENT_REGISTRY_SECRET_NAME,
    });
  };
}
