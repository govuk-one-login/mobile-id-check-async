import {
  decodeProtectedHeader,
  importJWK,
  KeyLike,
  ProtectedHeaderParameters,
} from "jose";
import { errorResult, Result, successResult } from "../../utils/result";
import {
  ISendHttpRequest,
  sendHttpRequest,
} from "../../services/http/sendHttpRequest";

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
    jwksEndpoint: string,
    jwt: string,
  ): Promise<Result<Uint8Array | KeyLike>> {
    let kid;
    try {
      kid = this.getTokenKid(jwt);
    } catch (error) {
      return errorResult({
        errorMessage: `Error getting public key: ${error}`,
        errorCategory: "CLIENT_ERROR",
      });
    }

    let jwk;
    try {
      jwk = await this.getJwk(jwksEndpoint, kid);
    } catch (error) {
      return errorResult({
        errorMessage: `Error getting public key: ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    let publicKey;
    try {
      publicKey = await importJWK(jwk, jwk.alg);
    } catch (error) {
      return errorResult({
        errorMessage: `Error getting public key: ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(publicKey);
  }

  private getTokenKid(jwt: string): string {
    const decodedProtectedHeader: ProtectedHeaderParameters =
      decodeProtectedHeader(jwt);
    const { kid } = decodedProtectedHeader;
    if (!kid) {
      throw new Error("kid not present in JWT header");
    }
    return kid;
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

export interface IPublicKeyGetter {
  getPublicKey: (
    jwksEndpoint: string,
    jwt: string,
  ) => Promise<Result<KeyLike | Uint8Array>>;
}

export interface IJwks {
  keys: IJwk[];
}

interface IJwk extends JsonWebKey {
  alg: "ES256";
  kid: string;
  kty: "EC";
  use: "sig";
}
