import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { Result } from "../common/utils/result";

const REQUIRED_ENVIRONMENT_VARIABLES = ["SESSIONS_TABLE_NAME"] as const;

export type TestSessionsConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getTestSessionsConfig(
  env: NodeJS.ProcessEnv,
): Result<TestSessionsConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.TEST_SESSIONS_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
  }
  return envVarsResult;
}
