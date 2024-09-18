import { errorResult, Result, successResult } from "../../utils/result";
import { JWTPayload, SignJWT, KeyLike } from "jose";

export class TokenSigner implements ITokenSigner {
  async sign(
    payload: JWTPayload,
    signingKey: KeyLike | Uint8Array,
  ): Promise<Result<string>> {
    {
      try {
        const jwt = await new SignJWT(payload)
          .setProtectedHeader({ alg: "ES256", typ: "JWT" })
          .sign(signingKey);
        return successResult(jwt);
      } catch {
        return errorResult({
          errorMessage: "Error signing token",
          errorCategory: "SERVER_ERROR",
        });
      }
    }
  }
}

export interface ITokenSigner {
  sign: (
    payload: JWTPayload,
    signingKey: KeyLike | Uint8Array,
  ) => Promise<Result<string>>;
}
