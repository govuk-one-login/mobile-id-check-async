import {
  errorResult,
  Result,
  successResult,
} from "../../../common/utils/result";
import { createPublicKey, JsonWebKey, KeyObject } from "node:crypto";
import { CompactEncrypt } from "jose";
import { JWT } from "../tokenSigner/tokenSigner";

export type JWE = `${string}.${string}.${string}.${string}.${string}`;

export class TokenEncrypter implements ITokenEncrypter {
  private readonly jwksUri: string;

  constructor(jwksUri: string) {
    this.jwksUri = jwksUri;
  }

  async encrypt(jwt: JWT): Promise<Result<JWE>> {
    const getJwksResult = await this.getJwks();
    if (getJwksResult.isError) {
      return getJwksResult;
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
        errorCategory: "SERVER_ERROR",
      });
    }
  }

  private async getJwks(): Promise<Result<object>> {
    let response;
    try {
      response = await fetch(this.jwksUri, { method: "GET" });
      if (!response.ok) {
        return errorResult({
          errorMessage: "Error fetching JWKS",
          errorCategory: "SERVER_ERROR",
        });
      }
    } catch {
      return errorResult({
        errorMessage: "Unexpected network error fetching JWKS",
        errorCategory: "SERVER_ERROR",
      });
    }

    let body: object;
    try {
      body = await response.json();
      return successResult(body);
    } catch {
      return errorResult({
        errorMessage: "Response body cannot be parsed as JSON",
        errorCategory: "SERVER_ERROR",
      });
    }
  }

  private getEncryptionKey(responseBody: object): Result<KeyObject> {
    if (!("keys" in responseBody) || !Array.isArray(responseBody.keys)) {
      return errorResult({
        errorMessage: "Not a valid JWKS",
        errorCategory: "SERVER_ERROR",
      });
    }

    const jwk = responseBody.keys.find((key: JsonWebKey) => key.use === "enc");
    if (!jwk) {
      return errorResult({
        errorMessage: "No encryption key in JWKS",
        errorCategory: "SERVER_ERROR",
      });
    }

    try {
      const encryptionKey = createPublicKey({ key: jwk, format: "jwk" });
      return successResult(encryptionKey);
    } catch {
      return errorResult({
        errorMessage: "Error creating public encryption key",
        errorCategory: "SERVER_ERROR",
      });
    }
  }
}

export interface ITokenEncrypter {
  encrypt: (jwt: JWT) => Promise<Result<JWE>>;
}
