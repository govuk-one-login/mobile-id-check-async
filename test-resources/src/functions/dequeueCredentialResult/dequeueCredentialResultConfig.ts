import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { Result } from "../common/utils/result";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "CREDENTIAL_RESULT_TTL_DURATION_IN_SECONDS",
  "CREDENTIAL_RESULTS_TABLE_NAME",
] as const;

export type BiometricTokenConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getDequeueCredentialResultConfig(
  env: NodeJS.ProcessEnv,
): Result<BiometricTokenConfig, MissingEnvVarError> {
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
