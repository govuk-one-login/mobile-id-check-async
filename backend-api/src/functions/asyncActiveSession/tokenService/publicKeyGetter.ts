import {
  decodeProtectedHeader,
  importJWK,
  KeyLike,
  ProtectedHeaderParameters,
} from "jose";
import { errorResult, Result, successResult } from "../../utils/result";

export class PublicKeyGetter implements IPublicKeyGetter {
  async getPublicKey(
    jwks: IJwks,
    jwt: string,
  ): Promise<Result<Uint8Array | KeyLike>> {
    let decodedProtectedHeader: ProtectedHeaderParameters;
    try {
      decodedProtectedHeader = decodeProtectedHeader(jwt);
    } catch (error) {
      return errorResult({
        errorMessage: `${error}`,
        errorCategory: "CLIENT_ERROR",
      });
    }

    const keyId = decodedProtectedHeader.kid;
    if (!keyId) {
      return errorResult({
        errorMessage: "kid not present in JWT header",
        errorCategory: "CLIENT_ERROR",
      });
    }

    const jwk = jwks.keys.find((key) => key.kid === keyId);

    if (!jwk) {
      return errorResult({
        errorMessage: "JWKS did not include the provided kid",
        errorCategory: "CLIENT_ERROR",
      });
    }

    let publicKey;
    try {
      publicKey = await importJWK(jwk, jwk.alg);
    } catch (error) {
      return errorResult({
        errorMessage: `Error converting JWK to key object: ${error}`,
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(publicKey);
  }
}

export interface IPublicKeyGetter {
  getPublicKey: (
    jwks: IJwks,
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
