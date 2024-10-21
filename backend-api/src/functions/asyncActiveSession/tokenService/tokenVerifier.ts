import {jwtVerify, KeyLike} from "jose";
import { errorResult, Result, successResult } from "../../utils/result";

export interface ITokenVerifier {
  verify: (
    token: string,
    publicKey: KeyLike | Uint8Array,
  ) => Promise<Result<null>>;
}

export class TokenVerifier implements ITokenVerifier {
  async verify(
    token: string,
    publicKey: KeyLike | Uint8Array,
  ): Promise<Result<null>> {
    try {
      await jwtVerify(token, publicKey);
    } catch {
      return errorResult({
        errorMessage: "Error verifying token signature",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(null);
  }
}
