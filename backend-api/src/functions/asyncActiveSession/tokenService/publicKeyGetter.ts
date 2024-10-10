import {
  decodeProtectedHeader,
  importJWK,
  KeyLike,
  ProtectedHeaderParameters,
} from "jose";
import { errorResult, Result, successResult } from "../../utils/result";

export class PublicKeyGetter implements IPublicKeyGetter {
  async getPublicKey(
    jwt: string,
    jwks: IJwks,
  ): Promise<Result<Uint8Array | KeyLike>> {
    const getDecodedProtectedHeaderResult =
      await this.getDecodeProtectedHeader(jwt);
    if (getDecodedProtectedHeaderResult.isError) {
      return getDecodedProtectedHeaderResult;
    }

    const decodedProtectedHeader = getDecodedProtectedHeaderResult.value;

    const keyId = decodedProtectedHeader.kid;
    if (!keyId) {
      return errorResult({
        errorMessage:
          "Failed verifying service token signature: kid not present in JWT header",
        errorCategory: "CLIENT_ERROR",
      });
    }

    const jwk = jwks.keys.find((key) => key.kid === keyId);

    if (!jwk) {
      return errorResult({
        errorMessage: "Failed verifying service token signature: JWK not found",
        errorCategory: "CLIENT_ERROR",
      });
    }

    let publicKey;
    try {
      publicKey = await importJWK(jwk, jwk.alg);
    } catch (error) {
      return errorResult({
        errorMessage:
          "Failed verifying service token signature: Error converting JWK to key object",
        errorCategory: "SERVER_ERROR", // SERVER / CLIENT ERROR?
      });
    }

    if (!publicKey) {
      return errorResult({
        errorMessage:
          "Failed verifying service token signature: Error converting JWK to key object",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(publicKey);
  }

  private async getDecodeProtectedHeader(
    jwt: string,
  ): Promise<Result<ProtectedHeaderParameters>> {
    let decodedProtectedHeader: ProtectedHeaderParameters;
    try {
      decodedProtectedHeader = decodeProtectedHeader(jwt);
    } catch (error) {
      return errorResult({
        errorMessage: `Failed verifying service token signature. ${error}`,
        errorCategory: "CLIENT_ERROR", // CLIENT or SERVER error?
      });
    }
    return successResult(decodedProtectedHeader);
  }
}

export interface IPublicKeyGetter {
  getPublicKey: (
    jwt: string,
    jwks: IJwks,
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
