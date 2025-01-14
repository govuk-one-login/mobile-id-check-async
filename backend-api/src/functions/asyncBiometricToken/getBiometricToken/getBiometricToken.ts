import { Result, successResult } from "../../utils/result";

export type GetBiometricToken = (
  url: string,
  submitterKey: string,
) => Promise<Result<string, void>>;

export const getBiometricToken: GetBiometricToken = async () => {
  return successResult("mockBiometricToken");
};
