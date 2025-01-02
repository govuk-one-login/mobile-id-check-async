import { GetSecrets } from "../common/config/secrets";
import { getParametersByName } from "@aws-lambda-powertools/parameters/ssm";
import { SSMGetParametersByNameOptions } from "@aws-lambda-powertools/parameters/ssm/types";
import { errorResult, successResult } from "../utils/result";

export const getSecretsFromParameterStore: GetSecrets = async (
  secretNames,
  cacheDurationInSeconds = 0,
) => {
  const parametersConfig: Record<string, SSMGetParametersByNameOptions> =
    secretNames.reduce(addNewKeyWithEmptyObjectAsValue, {});
  let secrets: Record<string, string>;
  try {
    secrets = await getParametersByName<string>(parametersConfig, {
      maxAge: cacheDurationInSeconds,
      decrypt: true,
    });
  } catch (error) {
    console.log(error);
    return errorResult({
      errorMessage: "server_error",
    });
  }
  return successResult(secretNames.map((secretName) => secrets[secretName]));
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
