import { Result, successResult } from "../../../utils/result";
import { JwtAlg } from "./types";

export const createSignedJwt = (
  _message: string,
  _alg: JwtAlg,
): Promise<Result<string, void>> => {
  return Promise.resolve(successResult("mockSignedJwt"));
};
