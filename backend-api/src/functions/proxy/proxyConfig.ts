import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/config/environment";
import { Result } from "../utils/result";
import { Logger } from "../services/logging/logger";
import { MessageName } from "./registeredLogs";

const REQUIRED_ENVIRONMENT_VARIABLES = ["PRIVATE_API_URL"] as const;

export type ProxyConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getProxyConfig(
  env: NodeJS.ProcessEnv,
  logger: Logger<MessageName>,
): Result<ProxyConfig, MissingEnvVarError> {
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
