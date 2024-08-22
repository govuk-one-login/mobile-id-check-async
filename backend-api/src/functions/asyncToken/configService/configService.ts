import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  SIGNING_KEY_ID: string;
  TXMA_SQS: string;
  ISSUER: string;
  CLIENT_REGISTRY_SECRET_NAME: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.SIGNING_KEY_ID)
      return errorResult({
        errorMessage: "No SIGNING_KEY_ID",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.TXMA_SQS)
      return errorResult({
        errorMessage: "No TXMA_SQS",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.ISSUER)
      return errorResult({
        errorMessage: "No ISSUER",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.CLIENT_REGISTRY_SECRET_NAME)
      return errorResult({
        errorMessage: "No CLIENT_REGISTRY_SECRET_NAME",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      TXMA_SQS: env.TXMA_SQS,
      ISSUER: env.ISSUER,
      CLIENT_REGISTRY_SECRET_NAME: env.CLIENT_REGISTRY_SECRET_NAME,
    });
  };
}
