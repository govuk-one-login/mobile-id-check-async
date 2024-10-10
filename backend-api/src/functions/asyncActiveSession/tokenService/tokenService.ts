import {
  RetryConfig,
  sendHttpRequest,
  SuccessfulHttpResponse,
} from "../../services/http/sendHttpRequest";
import { errorResult, Result, successResult } from "../../utils/result";
import { KMSAdapter } from "../../adapters/kmsAdapter";
import crypto from "crypto";
import { jwtVerify, JWTVerifyResult, KeyLike } from "jose";
import { IJwks, IPublicKeyGetter } from "./publicKeyGetter";

export class TokenService implements ITokenService {
  private readonly dependencies: ITokenServiceDependencies;

  constructor(dependencies: ITokenServiceDependencies) {
    this.dependencies = dependencies;
  }

  getSubFromToken = async (
    stsJwksEndpoint: string,
    encryptionKeyArn: string,
    jwe: string,
    retryConfig: RetryConfig,
  ): Promise<Result<string>> => {
    const stsJwksEndpointResponseResult = await this.getJwks(
      stsJwksEndpoint,
      retryConfig,
    );
    if (stsJwksEndpointResponseResult.isError) {
      return stsJwksEndpointResponseResult;
    }

    const jwks = stsJwksEndpointResponseResult.value;

    const getJweComponentsResult = this.getJweComponents(jwe);
    if (getJweComponentsResult.isError) {
      return getJweComponentsResult;
    }

    const [protectedHeader, encryptedCek, iv, ciphertext, tag] =
      getJweComponentsResult.value;

    const decryptCekResult = await new KMSAdapter().decrypt(
      encryptionKeyArn,
      new Uint8Array(Buffer.from(encryptedCek, "base64")),
    );
    if (decryptCekResult.isError) {
      return decryptCekResult;
    }

    const cek = decryptCekResult.value;

    const decryptJweResult = await this.decryptJwe(
      cek,
      Buffer.from(iv, "base64"),
      Buffer.from(ciphertext, "base64"),
      Buffer.from(tag, "base64"),
      new Uint8Array(Buffer.from(protectedHeader)),
    );
    if (decryptJweResult.isError) {
      return decryptJweResult;
    }

    const jwt = decryptJweResult.value;

    const publicKeyGetter = this.dependencies.publicKeyGetter();
    const getPublicKeyFromJwksResult = await publicKeyGetter.getPublicKey(
      jwt,
      jwks,
    );
    if (getPublicKeyFromJwksResult.isError) {
      return getPublicKeyFromJwksResult;
    }

    const publicKey = getPublicKeyFromJwksResult.value;

    const verifyTokenSignatureResult = await this.verifyTokenSignature(
      jwt,
      publicKey,
    );
    if (verifyTokenSignatureResult.isError) {
      return verifyTokenSignatureResult;
    }

    // const { payload } = verifyTokenSignatureResult.value;

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

  private async getJwks(
    stsJwksEndpoint: string,
    retryConfig: RetryConfig,
  ): Promise<Result<IJwks>> {
    const sendHttpRequestResult = await sendHttpRequest(
      { url: stsJwksEndpoint, method: "GET" },
      retryConfig,
    );

    if (sendHttpRequestResult.isError) {
      return sendHttpRequestResult;
    }

    const jwksEndpointResponse = sendHttpRequestResult.value;

    const getJwksFromResponseResult =
      await this.getJwksFromResponse(jwksEndpointResponse);

    if (getJwksFromResponseResult.isError) {
      return getJwksFromResponseResult;
    }

    const jwks = getJwksFromResponseResult.value;

    return successResult(jwks);
  }

  private getJweComponents(jwe: string): Result<string[]> {
    const jweComponents = jwe.split(".");

    if (jweComponents.length !== 5) {
      return errorResult({
        errorMessage:
          "Decrypt service token failure: JWE does not consist of five components",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(jweComponents);
  }

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
    decryptedCek: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    additionalData: Uint8Array,
  ): Promise<Result<string>> {
    const webcrypto = crypto.webcrypto as unknown as Crypto;

    let cek: CryptoKey;
    try {
      cek = await webcrypto.subtle.importKey(
        "raw",
        decryptedCek,
        "AES-GCM",
        false,
        ["decrypt"],
      );
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

  private async verifyTokenSignature(
    jwt: string,
    publicKey: Uint8Array | KeyLike,
  ): Promise<Result<JWTVerifyResult>> {
    let result: JWTVerifyResult;
    try {
      result = await jwtVerify(jwt, publicKey);
    } catch (error) {
      return errorResult({
        errorMessage: `Failed verifying service token signature. ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(result);
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

export interface ITokenServiceDependencies {
  publicKeyGetter: () => IPublicKeyGetter;
}
