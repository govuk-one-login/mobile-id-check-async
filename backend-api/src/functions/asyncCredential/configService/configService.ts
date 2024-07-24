import { IGetConfig } from "../../types/config";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../../types/errorOrValue";

export interface Config {
  SIGNING_KEY_ID: string;
  ISSUER: string;
  SESSION_TABLE_NAME: string;
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: string;
  SESSION_TTL_IN_MILLISECONDS: number;
  SQS_QUEUE: string;
}

export class ConfigService implements IGetConfig<Config> {
  getConfig = (env: NodeJS.ProcessEnv): ErrorOrSuccess<Config> => {
    if (!env.SIGNING_KEY_ID) return errorResponse("No SIGNING_KEY_ID");
    if (!env.ISSUER) return errorResponse("No ISSUER");
    if (!env.SESSION_TABLE_NAME) return errorResponse("No SESSION_TABLE_NAME");
    if (!env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME)
      return errorResponse("No SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME");
    if (!env.SESSION_TTL_IN_MILLISECONDS)
      return errorResponse("No SESSION_TTL_IN_MILLISECONDS");
    if (isNaN(Number(env.SESSION_TTL_IN_MILLISECONDS)))
      return errorResponse("SESSION_TTL_IN_MILLISECONDS is not a valid number");
    if (!env.SQS_QUEUE) return errorResponse("No SQS_QUEUE");
    return successResponse({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      ISSUER: env.ISSUER,
      SESSION_TABLE_NAME: env.SESSION_TABLE_NAME,
      SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME:
        env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
      SESSION_TTL_IN_MILLISECONDS: parseInt(env.SESSION_TTL_IN_MILLISECONDS),
      SQS_QUEUE: env.SQS_QUEUE,
    });
  };
}
