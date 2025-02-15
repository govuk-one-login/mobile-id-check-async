import { jwtVerify } from "jose";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { IPublicKeyGetter, PublicKeyGetter } from "./publicKeyGetter";

export interface ITokenVerifier {
  verify: (
    token: string,
    kid: string,
    stsBaseUrl: string,
  ) => Promise<Result<null>>;
}

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
    stsBaseUrl: string,
  ): Promise<Result<null>> {
    const getPublicKeyResult = await this.publicKeyGetter.getPublicKey(
      stsBaseUrl,
      kid,
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
