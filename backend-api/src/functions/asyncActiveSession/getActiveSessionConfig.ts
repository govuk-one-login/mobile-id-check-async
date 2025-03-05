import {
  Config,
  getRequiredEnvironmentVariables,
} from "../common/config/environment";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { isValidUrl } from "../services/utils/isValidUrl";
import { emptyFailure, Result } from "../utils/result";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "ENCRYPTION_KEY_ARN",
  "SESSION_TABLE_NAME",
  "AUDIENCE",
  "STS_BASE_URL",
] as const;

export type ActiveSessionConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getActiveSessionConfig(
  env: NodeJS.ProcessEnv,
): Result<ActiveSessionConfig, void> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );

  if (envVarsResult.isError) {
    logger.error(LogMessage.ACTIVE_SESSION_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
    return emptyFailure();
  }

  if (!isStsUrlValidUrl(env)) {
    logger.error(LogMessage.ACTIVE_SESSION_INVALID_CONFIG, {
      errorMessage: "STS_BASE_URL is not a URL",
    });
    return emptyFailure();
  }

  return envVarsResult;
}

const isStsUrlValidUrl = (env: NodeJS.ProcessEnv): boolean => {
  // To satisfy typescript, this has already been checked in getRequiredEnvironmentVariables
  if (!env.STS_BASE_URL) {
    return false;
  }

  return isValidUrl(env.STS_BASE_URL);
};
