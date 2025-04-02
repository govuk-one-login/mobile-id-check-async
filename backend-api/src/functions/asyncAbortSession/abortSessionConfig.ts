import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { Result } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "SESSION_TABLE_NAME",
  "ISSUER",
  "TXMA_SQS",
  "IPVCORE_OUTBOUND_SQS",
] as const;

export type AbortSessionConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getAbortSessionConfig(
  env: NodeJS.ProcessEnv,
): Result<AbortSessionConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.error(LogMessage.ABORT_SESSION_INVALID_CONFIG, {
      data: { missingEnvironmentVariables: envVarsResult.value.missingEnvVars },
    });
  }
  return envVarsResult;
}
