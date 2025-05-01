import { Result, successResult } from "../../../utils/result";
import { CredentialJwtPayload } from "../../../types/jwt";

export const createSignedJwt = (
  _message: CredentialJwtPayload,
): Promise<Result<string, void>> => {
  return Promise.resolve(successResult("mockSignedJwt"));
};
