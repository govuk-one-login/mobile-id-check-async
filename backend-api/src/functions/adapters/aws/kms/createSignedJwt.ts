import { Result, successResult } from "../../../utils/result";
import { CredentialJwtPayload } from "./types";

export const createSignedJwt = (
  _message: CredentialJwtPayload,
): Promise<Result<string, void>> => {
  return Promise.resolve(successResult("mockSignedJwt"));
};
