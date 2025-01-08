import {
  errorResult,
  Result,
  SuccessResult,
  successResult,
} from "../../utils/result";

export type MissingEnvVarError = {
  missingEnvVars: string[];
};

export type Config<T extends string> = {
  [key in T]: string;
};

export const getRequiredEnvironmentVariables = <T extends string>(
  env: NodeJS.ProcessEnv,
  requiredEnvironmentVariables: readonly T[],
): Result<Config<T>, MissingEnvVarError> => {
  const config: Partial<Config<T>> = requiredEnvironmentVariables.reduce(
    (partialConfig: Partial<Config<T>>, key) => {
      partialConfig[key] = env[key];
      return partialConfig;
    },
    {},
  );

  const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
    (key) => !config[key],
  );

  if (missingEnvironmentVariables.length >= 1) {
    return errorResult({
      missingEnvVars: missingEnvironmentVariables,
    });
  }
  return successResult(config) as SuccessResult<Config<T>>;
};
