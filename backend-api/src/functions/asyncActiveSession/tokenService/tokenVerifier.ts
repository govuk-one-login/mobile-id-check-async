import { jwtVerify } from "jose";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { IPublicKeyGetter, PublicKeyGetter } from "./publicKeyGetter";
import { IGetKeys } from "../../common/jwks/types";
import { InMemoryJwksCache } from "../../common/jwks/JwksCache/JwksCache";

export interface ITokenVerifier {
  verify: (
    token: string,
    kid: string,
    stsBaseUrl: string,
  ) => Promise<Result<null>>;
}

export type TokenVerifierDependencies = {
  publicKeyGetter: IPublicKeyGetter;
  getKeys: IGetKeys;
};

const tokenVerifierDependencies: TokenVerifierDependencies = {
  publicKeyGetter: new PublicKeyGetter(),
  getKeys: (jwksUri: string, keyId?: string) =>
    InMemoryJwksCache.getSingletonInstance().getJwks(jwksUri, keyId),
};

export class TokenVerifier implements ITokenVerifier {
  private readonly publicKeyGetter: IPublicKeyGetter;
  private readonly getKeys: IGetKeys;

  constructor(dependencies = tokenVerifierDependencies) {
    this.publicKeyGetter = dependencies.publicKeyGetter;
    this.getKeys = dependencies.getKeys;
  }

  async verify(
    token: string,
    kid: string,
    stsBaseUrl: string,
  ): Promise<Result<null>> {
    const getPublicKeyResult = await this.publicKeyGetter.getPublicKey(
      stsBaseUrl,
      kid,
      this.getKeys,
    );
    if (getPublicKeyResult.isError) {
      return getPublicKeyResult;
    }

    const publicKey = getPublicKeyResult.value;

    try {
      await jwtVerify(token, publicKey);
    } catch {
      return errorResult({
        errorMessage: "Error verifying token signature",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    }

    return successResult(null);
  }
}
