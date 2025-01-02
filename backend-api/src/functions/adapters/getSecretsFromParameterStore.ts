import { GetSecrets } from "../common/config/secrets";

export const getSecretsFromParameterStore: GetSecrets = async (
  _secretNames,
  _cacheDurationInSeconds = 0,
) => {
  throw new Error("Not Implemented");
};
