import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { Result } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_PASSPORT",
  "BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_BRP",
  "BIOMETRIC_SUBMITTER_KEY_SECRET_PATH_DL",
  "BIOMETRIC_SUBMITTER_KEY_SECRET_CACHE_DURATION_IN_SECONDS",
  "READID_BASE_URL",
  "SESSION_TABLE_NAME",
  "TXMA_SQS",
  "ISSUER"
] as const;

export type BiometricTokenConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getBiometricTokenConfig(
  env: NodeJS.ProcessEnv,
): Result<BiometricTokenConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.BIOMETRIC_TOKEN_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
  }
  return envVarsResult;
}
