import { importJWK, KeyLike } from "jose";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import {
  ISendHttpRequest,
  sendHttpRequest,
} from "../../services/http/sendHttpRequest";

export interface IPublicKeyGetter {
  getPublicKey: (
    stsBaseUrl: string,
    kid: string,
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
  ): Promise<Result<Uint8Array | KeyLike>> {
    const jwksUri = stsBaseUrl + "/.well-known/jwks.json";

    let jwk;
    try {
      jwk = await this.getJwk(jwksUri, kid);
    } catch (error) {
      return errorResult({
        errorMessage: `Error getting JWK - ${error}`,
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

  private async getJwk(jwksEndpoint: string, kid: string): Promise<IJwk> {
    const response = await this.sendHttpRequest(
      {
        url: jwksEndpoint,
        method: "GET",
      },
      { maxAttempts: 3, delayInMillis: 100 },
    );

    const { body } = response;
    if (!body) {
      throw new Error("Empty response body");
    }

    const jwks = await this.getJwksFromResponseBody(body);

    const jwk = jwks.keys.find((key: IJwk) => key.kid && key.kid === kid);

    if (!jwk) {
      throw new Error("JWKS does not contain key matching provided key ID");
    }

    return jwk;
  }

  private async getJwksFromResponseBody(responseBody: string): Promise<IJwks> {
    const jwks = JSON.parse(responseBody);

    if (!this.isJwks(jwks)) {
      throw new Error("Response does not match the expected JWKS structure");
    }

    return jwks;
  }

  private readonly isJwks = (data: unknown): data is IJwks => {
    return (
      typeof data === "object" &&
      data !== null &&
      "keys" in data &&
      Array.isArray(data.keys) &&
      data.keys.every((key) => typeof key === "object" && key !== null)
    );
  };
}
