import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  SIGNING_KEY_ID: string;
  SQS_QUEUE: string;
  ISSUER: string;
  CLIENT_REGISTRY_PARAMETER_NAME: string
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.SIGNING_KEY_ID) return errorResult("No SIGNING_KEY_ID");
    if (!env.SQS_QUEUE) return errorResult("No SQS_QUEUE");
    if (!env.ISSUER) return errorResult("No ISSUER");
    if (!env.CLIENT_REGISTRY_PARAMETER_NAME)
      return errorResult("No CLIENT_REGISTRY_PARAMETER_NAME");

    return successResult({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      SQS_QUEUE: env.SQS_QUEUE,
      ISSUER: env.ISSUER,
      CLIENT_REGISTRY_PARAMETER_NAME: env.CLIENT_REGISTRY_PARAMETER_NAME,
    });
  };
}
