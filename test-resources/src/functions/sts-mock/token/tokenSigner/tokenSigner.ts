import {
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
  ) => Promise<Result<JWT, void>>;
}

export class TokenSigner implements ITokenSigner {
  async sign(
    keyId: string,
    payload: JWTPayload,
    signingKey: KeyObject,
  ): Promise<Result<JWT, void>> {
    try {
      const jwt = (await new SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", typ: "JWT", kid: keyId })
        .sign(signingKey)) as JWT;
      return successResult(jwt);
    } catch {
      return errorResult({
        errorMessage: "Error signing token",
        errorCategory: "SERVER_ERROR",
      });
    }
  }
}
