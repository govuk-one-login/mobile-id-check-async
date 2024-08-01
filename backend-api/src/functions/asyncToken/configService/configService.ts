import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  SIGNING_KEY_ID: string;
  SQS_QUEUE: string;
  ISSUER: string;
  CLIENT_REGISTRY_PARAMETER_NAME: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.SIGNING_KEY_ID)
      return errorResult({
        errorMessage: "No SIGNING_KEY_ID",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.SQS_QUEUE)
      return errorResult({
        errorMessage: "No SQS_QUEUE",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.ISSUER)
      return errorResult({
        errorMessage: "No ISSUER",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.CLIENT_REGISTRY_PARAMETER_NAME)
      return errorResult({
        errorMessage: "No CLIENT_REGISTRY_PARAMETER_NAME",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      SQS_QUEUE: env.SQS_QUEUE,
      ISSUER: env.ISSUER,
      CLIENT_REGISTRY_PARAMETER_NAME: env.CLIENT_REGISTRY_PARAMETER_NAME,
    });
  };
}
