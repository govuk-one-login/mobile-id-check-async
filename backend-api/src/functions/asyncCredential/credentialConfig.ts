import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { errorResult, Result } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "CLIENT_REGISTRY_SECRET_NAME",
  "ISSUER",
  "SESSION_DURATION_IN_SECONDS",
  "SESSION_TABLE_NAME",
  "SIGNING_KEY_ID",
  "TXMA_SQS",
] as const;

export type CredentialConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getCredentialConfig(
  env: NodeJS.ProcessEnv,
): Result<CredentialConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.CREDENTIAL_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
    return envVarsResult;
  }

  // Reject duration config values that don't parse as an integer.
  if (!/^\d+$/.test(envVarsResult.value.SESSION_DURATION_IN_SECONDS)) {
    logger.error(LogMessage.CREDENTIAL_INVALID_CONFIG, {
      errorMessage: "SESSION_DURATION_IN_SECONDS is not a valid number",
    });
    return errorResult({ missingEnvVars: ["SESSION_DURATION_IN_SECONDS"] });
  }
  return envVarsResult;
}
