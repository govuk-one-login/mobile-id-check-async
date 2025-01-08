import { Result } from "../../utils/result";

export type GetSecretsConfiguration = {
  secretNames: string[];
  cacheDurationInSeconds?: number;
};

export type GetSecrets = (
  config: GetSecretsConfiguration,
) => Promise<Result<string[], void>>;
