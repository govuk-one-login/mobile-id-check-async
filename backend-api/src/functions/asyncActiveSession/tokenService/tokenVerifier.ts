import { jwtVerify, JWTVerifyResult, KeyLike } from "jose";
import { errorResult, Result, successResult } from "../../utils/result";



export class TokenVerifier implements ITokenVerifier {
  async verify(jwt: string, key: KeyLike | Uint8Array): Promise<Result<JWTVerifyResult>> {
    let result: JWTVerifyResult;
    try {
      result = await jwtVerify(jwt, key);
    } catch (error) {
      return errorResult({
        errorMessage: `Error verifying token signature: ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(result);
  }
}

export interface ITokenVerifier {
  verify: (jwt: string, key: KeyLike | Uint8Array) => Promise<Result<JWTVerifyResult>>
}
