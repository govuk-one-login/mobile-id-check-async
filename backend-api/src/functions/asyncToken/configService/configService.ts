import { IGetConfig } from "../../types/config";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../../types/errorOrValue";

export interface Config {
  SIGNING_KEY_ID: string;
  SQS_QUEUE: string;
  ISSUER: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): ErrorOrSuccess<Config> => {
    if (!env.SIGNING_KEY_ID) return errorResponse("No SIGNING_KEY_ID");
    if (!env.SQS_QUEUE) return errorResponse("No SQS_QUEUE");
    if (!env.ISSUER) return errorResponse("No ISSUER");
    return successResponse({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      SQS_QUEUE: env.SQS_QUEUE,
      ISSUER: env.ISSUER,
    });
  };
}
