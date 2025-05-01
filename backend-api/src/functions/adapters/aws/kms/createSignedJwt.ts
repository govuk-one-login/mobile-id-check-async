import { jwtPayload } from "../../../types/jwt";
import { Result, successResult } from "../../../utils/result";

export const createSignedJwt = (
  _message: jwtPayload,
): Promise<Result<string, void>> => {
  return Promise.resolve(successResult("mockSignedJwt"));
};
