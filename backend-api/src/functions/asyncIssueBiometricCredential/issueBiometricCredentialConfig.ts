import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { Result } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "READID_BASE_URL",
  "BIOMETRIC_VIEWER_KEY_SECRET_PATH",
  "BIOMETRIC_VIEWER_ACCESS_KEY_SECRET_CACHE_DURATION_IN_SECONDS",
  "IPVCORE_OUTBOUND_SQS",
  "SESSION_TABLE_NAME",
  "TXMA_SQS",
  "ISSUER",
] as const;

export type IssueBiometricCredentialConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getIssueBiometricCredentialConfig(
  env: NodeJS.ProcessEnv,
): Result<IssueBiometricCredentialConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
  }
  return envVarsResult;
}
