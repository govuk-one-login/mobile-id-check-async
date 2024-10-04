import {
  RetryConfig,
  sendHttpRequest,
  SuccessfulHttpResponse,
} from "../../services/http/sendHttpRequest";
import { errorResult, Result, successResult } from "../../utils/result";
import { KMSAdapter } from "../../adapters/kmsAdapter";
import crypto from "crypto";

export class TokenService implements ITokenService {
  getSubFromToken = async (
    stsJwksEndpoint: string,
    encryptionKeyArn: string,
    jwe: string,
    retryConfig: RetryConfig,
  ): Promise<Result<string>> => {
    const stsJwksEndpointResponseResult = await sendHttpRequest(
      { url: stsJwksEndpoint, method: "GET" },
      retryConfig,
    );

    if (stsJwksEndpointResponseResult.isError) {
      return stsJwksEndpointResponseResult;
    }

    const stsJwksEndpointResponse = stsJwksEndpointResponseResult.value;

    const getJwksFromResponseResult = await this.getJwksFromResponse(
      stsJwksEndpointResponse,
    );

    if (getJwksFromResponseResult.isError) {
      return getJwksFromResponseResult;
    }

    const jweComponents = jwe.split(".");

    if (jweComponents.length !== 5) {
      return errorResult({
        errorMessage:
          "Decrypt service token failure: JWE does not consist of five components",
        errorCategory: "CLIENT_ERROR",
      });
    }

    const [protectedHeader, encryptedCek, iv, ciphertext, tag] = jweComponents;

    const decryptCekResult = await new KMSAdapter().decrypt(
      encryptionKeyArn,
      new Uint8Array(Buffer.from(encryptedCek, "base64")),
    );
    if (decryptCekResult.isError) {
      return decryptCekResult;
    }

    const cek = decryptCekResult.value;

    const decryptedJweResult = await this.decryptJwe(
      cek,
      Buffer.from(iv, "base64"),
      Buffer.from(ciphertext, "base64"),
      Buffer.from(tag, "base64"),
      new Uint8Array(Buffer.from(protectedHeader)),
    );
    if (decryptedJweResult.isError) {
      return decryptedJweResult;
    }

    return successResult("");
  };

  private readonly isJwks = (data: unknown): data is IJwks => {
    return (
      typeof data === "object" &&
      data !== null &&
      "keys" in data &&
      Array.isArray(data.keys) &&
      data.keys.every((key) => typeof key === "object" && key !== null)
    );
  };

  private async getJwksFromResponse(
    response: SuccessfulHttpResponse,
  ): Promise<Result<IJwks>> {
    let jwks;
    if (!response.body) {
      return errorResult({
        errorMessage: "Response body empty",
        errorCategory: "SERVER_ERROR",
      });
    }
    try {
      jwks = JSON.parse(response.body);
    } catch {
      return errorResult({
        errorMessage: "Invalid JSON in response",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!this.isJwks(jwks)) {
      return errorResult({
        errorMessage: "Response does not match the expected JWKS structure",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(jwks);
  }

  private async decryptJwe(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    additionalData: Uint8Array,
  ): Promise<Result<string>> {
    const webcrypto = crypto.webcrypto as unknown as Crypto;

    let cek: CryptoKey;
    try {
      cek = await webcrypto.subtle.importKey("raw", key, "AES-GCM", false, [
        "decrypt",
      ]);
    } catch (error) {
      return errorResult({
        errorMessage: `Error converting cek to CryptoKey. ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    let decryptedBuffer: ArrayBuffer;
    try {
      decryptedBuffer = await webcrypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData,
          tagLength: 128,
        },
        cek,
        Buffer.concat([new Uint8Array(ciphertext), new Uint8Array(tag)]),
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Error decrypting JWE. ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    const decoder = new TextDecoder();
    return successResult(decoder.decode(decryptedBuffer));
  }
}

export interface ITokenService {
  getSubFromToken: (
    stsJwksEndpoint: string,
    encryptionKeyArn: string,
    jwe: string,
    retryConfig: RetryConfig,
  ) => Promise<Result<string>>;
}

interface IJwks {
  keys: object[];
}
