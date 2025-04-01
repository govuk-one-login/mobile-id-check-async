import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../common/utils/result";
import { JWTPayload, SignJWT } from "jose";
import { KeyObject } from "node:crypto";

export type JWT = `${string}.${string}.${string}`;

export interface ITokenSigner {
  sign: (
    keyId: string,
    payload: JWTPayload,
    signingKey: KeyObject,
  ) => Promise<Result<JWT>>;
}

export class TokenSigner implements ITokenSigner {
  async sign(
    keyId: string,
    payload: JWTPayload,
    signingKey: KeyObject,
  ): Promise<Result<JWT>> {
    try {
      const jwt = (await new SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", typ: "JWT", kid: keyId })
        .sign(signingKey)) as JWT;
      return successResult(jwt);
    } catch {
      return errorResult({
        errorMessage: "Error signing token",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }
  }
}
