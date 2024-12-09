import {
  Config,
  getRequiredEnvironmentVariables,
  MissingEnvVarError,
} from "../common/utils/environment";
import { Result } from "../utils/result";

const REQUIRED_ENVIRONMENT_VARIABLES = ["SESSIONS_TABLE"] as const;

export type RedirectConfig = Config<
  (typeof REQUIRED_ENVIRONMENT_VARIABLES)[number]
>;

export function getConfigFromEnvironment(
  env: NodeJS.ProcessEnv,
): Result<RedirectConfig, MissingEnvVarError> {
  const envVarsResult = getRequiredEnvironmentVariables(
    env,
    REQUIRED_ENVIRONMENT_VARIABLES,
  );
  if (envVarsResult.isError) {
    console.log({
      missingEnvironmentVariables: envVarsResult.value.missingEnvVars,
    }); // replace with proper logging
  }
  return envVarsResult;
}
