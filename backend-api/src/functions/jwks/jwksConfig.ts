import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { Result } from "../utils/result";
import { Logger } from "../services/logging/logger";
import { MessageName } from "./registeredLogs";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "ENCRYPTION_KEY_ID",
  "JWKS_BUCKET_NAME",
  "JWKS_FILE_NAME",
  "VERIFIABLE_CREDENTIAL_SIGNING_KEY_ID",
] as const;

export type JwksConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getJwksConfig(
  env: NodeJS.ProcessEnv,
  logger: Logger<MessageName>,
): Result<JwksConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    logger.log("ENVIRONMENT_VARIABLE_MISSING", {
      errorMessage: `No ${envVarsResult.value.missingEnvVars.join(",")}`,
    });
  }
  return envVarsResult;
}
