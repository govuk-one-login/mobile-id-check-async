import { importJWK, KeyLike } from "jose";
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

    const getJwkResult = await this.getJwk(jwksUri, kid);
    if (getJwkResult.isError) {
      return errorResult({
        errorMessage: `Error getting JWK - ${getJwkResult.value}`,
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }
    const jwk = getJwkResult.value;

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

  private async getJwk(
    jwksEndpoint: string,
    kid: string,
  ): Promise<Result<IJwk, GetJwkError>> {
    const getJwtResult = await this.sendHttpRequest(
      {
        url: jwksEndpoint,
        method: "GET",
      },
      { maxAttempts: 3, delayInMillis: 100 },
    );

    if (getJwtResult.isError) {
      return errorResult(getJwtResult.value);
    }

    const getJwtResponse = getJwtResult.value;

    const { body } = getJwtResponse;
    if (!body) {
      return errorResult("Empty response body");
    }

    const getJwksResult = this.getJwksFromResponseBody(body);
    if (getJwksResult.isError) {
      return getJwksResult;
    }
    const jwks = getJwksResult.value;

    const jwk = jwks.keys.find((key: IJwk) => key.kid && key.kid === kid);

    if (!jwk) {
      return errorResult("JWKS does not contain key matching provided key ID");
    }

    return successResult(jwk);
  }

  private getJwksFromResponseBody(responseBody: string): Result<IJwks, string> {
    let jwks;
    try {
      jwks = JSON.parse(responseBody);
    } catch {
      return errorResult(
        `Response body could not be parsed as JSON. Response body: ${responseBody}`,
      );
    }

    if (!this.isJwks(jwks)) {
      return errorResult(
        `Response body does not match the expected JWKS structure. Response body: ${responseBody}`,
      );
    }

    return successResult(jwks);
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

export type GetJwkError = string | HttpError;
