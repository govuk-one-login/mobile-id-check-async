import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment.js";
import { logger } from "../common/logging/logger.js";
import { LogMessage } from "../common/logging/LogMessage.js";
import { Result } from "../common/utils/result.js";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS",
  "CREDENTIAL_RESULT_TABLE_NAME",
] as const;

export type DequeueCredentialResultConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getDequeueCredentialResultConfig(
  env: NodeJS.ProcessEnv,
): Result<DequeueCredentialResultConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.DEQUEUE_CREDENTIAL_RESULT_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
  }
  return envVarsResult;
}
