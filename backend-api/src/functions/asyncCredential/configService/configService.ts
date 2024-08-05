import { IGetConfig } from "../../types/config";
import { errorResult, Result, successResult } from "../../utils/result";

export interface Config {
  SIGNING_KEY_ID: string;
  ISSUER: string;
  SESSION_TABLE_NAME: string;
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: string;
  SESSION_TTL_IN_MILLISECONDS: number;
  SQS_QUEUE: string;
  CLIENT_REGISTRY_PARAMETER_NAME: string;
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
    if (!env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME)
      return errorResult({
        errorMessage: "No SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.SESSION_TTL_IN_MILLISECONDS)
      return errorResult({
        errorMessage: "No SESSION_TTL_IN_MILLISECONDS",
        errorCategory: "SERVER_ERROR",
      });
    if (isNaN(Number(env.SESSION_TTL_IN_MILLISECONDS)))
      return errorResult({
        errorMessage: "SESSION_TTL_IN_MILLISECONDS is not a valid number",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.SQS_QUEUE)
      return errorResult({
        errorMessage: "No SQS_QUEUE",
        errorCategory: "SERVER_ERROR",
      });
    if (!env.CLIENT_REGISTRY_PARAMETER_NAME)
      return errorResult({
        errorMessage: "No CLIENT_REGISTRY_PARAMETER_NAME",
        errorCategory: "SERVER_ERROR",
      });

    return successResult({
      SIGNING_KEY_ID: env.SIGNING_KEY_ID,
      ISSUER: env.ISSUER,
      SESSION_TABLE_NAME: env.SESSION_TABLE_NAME,
      SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME:
        env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
      SESSION_TTL_IN_MILLISECONDS: parseInt(env.SESSION_TTL_IN_MILLISECONDS),
      SQS_QUEUE: env.SQS_QUEUE,
      CLIENT_REGISTRY_PARAMETER_NAME: env.CLIENT_REGISTRY_PARAMETER_NAME,
    });
  };
}
