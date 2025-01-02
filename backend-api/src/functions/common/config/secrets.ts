import { Result } from "../../utils/result";

export type GetSecrets = (
  secretNames: string[],
  cacheDurationInSeconds?: number,
) => Promise<Result<string[]>>;
