import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { errorResult, Result } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "DEMO_SQS",
  "MAX_RETRY_DELAY_IN_SECONDS",
] as const;

export type BackoffRetryDemoConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getBackoffRetryDemoConfig(
  env: NodeJS.ProcessEnv,
): Result<BackoffRetryDemoConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.BACKOFF_RETRY_DEMO_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
    return envVarsResult;
  }

  // Reject max retry config values that don't parse as an integer.
  if (!/^\d+$/.test(envVarsResult.value.MAX_RETRY_DELAY_IN_SECONDS)) {
    logger.error(LogMessage.CREDENTIAL_INVALID_CONFIG, {
      errorMessage: "MAX_RETRY_DELAY_IN_SECONDS is not a valid number",
    });
    return errorResult({ missingEnvVars: ["MAX_RETRY_DELAY_IN_SECONDS"] });
  }
  return envVarsResult;
}
