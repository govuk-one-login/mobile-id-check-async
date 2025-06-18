import { importJWK, JWK, KeyLike } from "jose";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import {
  HttpError,
  ISendHttpRequest,
  sendHttpRequest,
} from "../../adapters/http/sendHttpRequest";
import { IGetKeys } from "../../common/jwks/types";

export interface IPublicKeyGetter {
  getPublicKey: (
    stsBaseUrl: string,
    kid: string,
    getJwks: IGetKeys,
  ) => Promise<Result<KeyLike | Uint8Array>>;
}

export interface IJwks {
  keys: IJwk[];
}

export interface IJwk extends JsonWebKey {
  alg: "ES256";
  kid: string;
  kty: "EC";
  use: "sig";
}

export type PublicKeyGetterDependencies = {
  sendHttpRequest: ISendHttpRequest;
};

const publicKeyGetterDependencies: PublicKeyGetterDependencies = {
  sendHttpRequest: sendHttpRequest,
};

export class PublicKeyGetter implements IPublicKeyGetter {
  private readonly sendHttpRequest: ISendHttpRequest;
  constructor(dependencies = publicKeyGetterDependencies) {
    this.sendHttpRequest = dependencies.sendHttpRequest;
  }

  async getPublicKey(
    stsBaseUrl: string,
    kid: string,
    getJwks: IGetKeys,
  ): Promise<Result<Uint8Array | KeyLike>> {
    const jwksUri = stsBaseUrl + "/.well-known/jwks.json";

    const getJwksResult = await getJwks(jwksUri, kid);
    if (getJwksResult.isError) {
      return errorResult({
        errorMessage: `Error getting JWK`,
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const jwks = getJwksResult.value;
    const jwk = jwks.keys.find((key) => "kid" in key && key.kid === kid) as JWK;

    if (!jwk) {
      return errorResult({
        errorMessage: `Error getting JWK`,
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    let publicKey;
    try {
      publicKey = await importJWK(jwk, jwk.alg);
    } catch (error) {
      return errorResult({
        errorMessage: `Invalid JWK - ${error}`,
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    return successResult(publicKey);
  }
}

export type GetJwkError = string | HttpError;
