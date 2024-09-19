import { errorResult, Result, successResult } from "../../utils/result";
import { JWTPayload, SignJWT } from "jose";
import { KeyObject } from "node:crypto";

export class TokenSigner implements ITokenSigner {
  async sign(
    keyId: string,
    payload: JWTPayload,
    signingKey: KeyObject,
  ): Promise<Result<string>> {
    {
      try {
        const jwt = await new SignJWT(payload)
          .setProtectedHeader({ alg: "ES256", typ: "JWT", kid: keyId })
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
    keyId: string,
    payload: JWTPayload,
    signingKey: KeyObject,
  ) => Promise<Result<string>>;
}
