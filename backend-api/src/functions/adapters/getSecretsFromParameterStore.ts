import { GetSecrets } from "../common/config/secrets";
import { getParametersByName } from "@aws-lambda-powertools/parameters/ssm";
import { SSMGetParametersByNameOptions } from "@aws-lambda-powertools/parameters/ssm/types";
import { emptyFailure, successResult } from "../utils/result";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";

export const getSecretsFromParameterStore: GetSecrets = async ({
  secretNames,
  cacheDurationInSeconds = 0,
}) => {
  const parametersConfig: Record<string, SSMGetParametersByNameOptions> =
    secretNames.reduce(addNewKeyWithEmptyObjectAsValue, {});
  let secrets: Record<string, string>;
  try {
    logger.debug(LogMessage.GET_SECRETS_FROM_PARAMETER_STORE_ATTEMPT, {
      data: {
        secretNames,
      },
    });
    secrets = await getParametersByName<string>(parametersConfig, {
      maxAge: cacheDurationInSeconds,
      decrypt: true,
    });
  } catch (error) {
    logger.error(
      LogMessage.GET_SECRETS_FROM_PARAMETER_STORE_FAILURE,
      error as Error,
    );
    return emptyFailure();
  }

  if (secretNames.some((secretName) => !secrets[secretName])) {
    logger.error(LogMessage.GET_SECRETS_FROM_PARAMETER_STORE_FAILURE, {
      error:
        "Response from parameter store was missing one or more requested secrets",
    });
    return emptyFailure();
  }

  logger.debug(LogMessage.GET_SECRETS_FROM_PARAMETER_STORE_SUCCESS);
  return successResult(secrets);
};

function addNewKeyWithEmptyObjectAsValue(
  targetObject: object,
  newKey: string,
): object {
  return {
    ...targetObject,
    [newKey]: {},
  };
}
