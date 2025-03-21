import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { Result } from "../utils/result";

const REQUIRED_ENVIRONMENT_VARIABLES = ["SESSION_TABLE_NAME"] as const;

export type TxmaEventConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getTxmaEventConfig(
  env: NodeJS.ProcessEnv,
): Result<TxmaEventConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.TXMA_EVENT_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
  }
  return envVarsResult;
}
