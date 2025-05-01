import { Result, successResult } from "../../../utils/result";
import { CredentialJwt } from "./types";

export const createSignedJwt = (
  _message: CredentialJwt,
): Promise<Result<string, void>> => {
  return Promise.resolve(successResult("mockSignedJwt"));
};
