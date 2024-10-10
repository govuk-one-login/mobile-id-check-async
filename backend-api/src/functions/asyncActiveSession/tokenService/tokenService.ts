import {
  RetryConfig,
  sendHttpRequest,
  SuccessfulHttpResponse,
} from "../../services/http/sendHttpRequest";
import { errorResult, Result, successResult } from "../../utils/result";
import crypto from "crypto";
import { IDecryptJwe } from "../jwe/jweDecryptor";

export class TokenService implements ITokenService {
  private readonly jweDecryptor;

  constructor(jweDecryptor: IDecryptJwe) {
    this.jweDecryptor = jweDecryptor;
  }

  // TO BE ADDED IN THE NEXT PR
  // async decryptJwe(jwe: string) {
  //   try {
  //     const jwt = await this.jweDecryptor.decrypt(jwe);
  //     return  successResult(jwt);
  //   } catch (error) {
  //     return errorResult({errorMessage: `Request failed to be decrypted: ${error}`, errorCategory: ""})
  //   }
  // }

  getSubFromToken = async (
    stsJwksEndpoint: string,
    jwe: string,
    retryConfig: RetryConfig,
  ): Promise<Result<string>> => {
    let jwt;
    try {
      jwt = await this.jweDecryptor.decrypt(jwe);
    } catch (error) {
      return errorResult({
        errorMessage: `Request failed to be decrypted: ${error}`,
        errorCategory: "",
      });
    }
    console.log(jwt);

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
    jwe: string,
    retryConfig: RetryConfig,
  ) => Promise<Result<string>>;
}

interface IJwks {
  keys: object[];
}
