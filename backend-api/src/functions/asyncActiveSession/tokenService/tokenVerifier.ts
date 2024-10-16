import { jwtVerify, JWTVerifyResult } from "jose";
import { errorResult, Result, successResult } from "../../utils/result";
import { IPublicKeyGetter, PublicKeyGetter } from "./publicKeyGetter";

export type TokenVerifierDependencies = {
  publicKeyGetter: IPublicKeyGetter;
};

const tokenVerifierDependencies: TokenVerifierDependencies = {
  publicKeyGetter: new PublicKeyGetter(),
};

export class TokenVerifier implements ITokenVerifier {
  private readonly publicKeyGetter: IPublicKeyGetter;

  constructor(dependencies = tokenVerifierDependencies) {
    this.publicKeyGetter = dependencies.publicKeyGetter;
  }

  async verify(
    token: string,
    kid: string,
    jwksUri: string,
  ): Promise<Result<JWTVerifyResult>> {
    const getPublicKeyResult = await this.publicKeyGetter.getPublicKey(
      jwksUri,
      kid,
    );
    if (getPublicKeyResult.isError) {
      return getPublicKeyResult;
    }

    const publicKey = getPublicKeyResult.value;

    let result: JWTVerifyResult;
    try {
      result = await jwtVerify(token, publicKey);
    } catch {
      return errorResult({
        errorMessage: "Error verifying token signature",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(result);
  }
}

export interface ITokenVerifier {
  verify: (
    token: string,
    kid: string,
    jwksUri: string,
  ) => Promise<Result<JWTVerifyResult>>;
}
