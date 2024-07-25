import { IGetConfig } from "../../types/config";
import { error, Result, success } from "../../types/result";

export interface Config {
  SIGNING_KEY_ID: string;
  SQS_QUEUE: string;
  ISSUER: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): Result<Config> => {
    if (!env.SIGNING_KEY_ID) return error("No SIGNING_KEY_ID");
    if (!env.SQS_QUEUE) return error("No SQS_QUEUE");
    if (!env.ISSUER) return error("No ISSUER");
    return success({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      SQS_QUEUE: env.SQS_QUEUE,
      ISSUER: env.ISSUER,
    });
  };
}
