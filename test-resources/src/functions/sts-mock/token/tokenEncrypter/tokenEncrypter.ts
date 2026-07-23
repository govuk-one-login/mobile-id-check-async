import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../common/utils/result";
import { createPublicKey, JsonWebKey, KeyObject } from "node:crypto";
import { CompactEncrypt } from "jose";
import { JWT } from "../tokenSigner/tokenSigner";
import {
  GetKeysResponse,
  IGetKeys,
} from "../../../common/jwks/JwksCache/types";
import { InMemoryJwksCache } from "../../../common/jwks/JwksCache/JwksCache";

export type JWE = `${string}.${string}.${string}.${string}.${string}`;

const defaultGetJwksImpl = (jwksUri: string) =>
  InMemoryJwksCache.getSingletonInstance().getJwks(jwksUri);

export class TokenEncrypter implements ITokenEncrypter {
  private readonly getJwks: IGetKeys;
  private readonly jwksUri: string;

  constructor(jwksUri: string, getJwks: IGetKeys = defaultGetJwksImpl) {
    this.jwksUri = jwksUri;
    this.getJwks = getJwks;
  }

  async encrypt(jwt: JWT): Promise<Result<JWE>> {
    const getJwksResult = await this.getJwks(this.jwksUri);
    if (getJwksResult.isError) {
      return errorResult({
        errorMessage: "Failed to get JWKS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const extractEncryptionKeyResult = this.getEncryptionKey(
      getJwksResult.value,
    );
    if (extractEncryptionKeyResult.isError) {
      return extractEncryptionKeyResult;
    }
    const encryptionKey = extractEncryptionKeyResult.value;

    const header = {
      alg: "RSA-OAEP-256",
      enc: "A256GCM",
    };

    const textEncoder = new TextEncoder();

    try {
      const jwtEncoded = new CompactEncrypt(textEncoder.encode(jwt));
      const jwe = (await jwtEncoded
        .setProtectedHeader(header)
        .encrypt(encryptionKey)) as JWE;
      return successResult(jwe);
    } catch {
      return errorResult({
        errorMessage: "Error encrypting token",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }
  }

  private getEncryptionKey(Jwks: GetKeysResponse): Result<KeyObject> {
    const jwk = Jwks.keys.find(
      (key): key is JsonWebKey =>
        typeof (key as Record<string, unknown>).use === "string" &&
        (key as Record<string, unknown>).use === "enc",
    );
    if (!jwk) {
      return errorResult({
        errorMessage: "No encryption key in JWKS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    try {
      const encryptionKey = createPublicKey({ key: jwk, format: "jwk" });
      return successResult(encryptionKey);
    } catch {
      return errorResult({
        errorMessage: "Error creating public encryption key",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }
  }
}

export interface ITokenEncrypter {
  encrypt: (jwt: JWT) => Promise<Result<JWE>>;
}
