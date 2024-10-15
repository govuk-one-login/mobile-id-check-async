import { errorResult, Result, successResult } from "../../utils/result";
import { KMSAdapter } from "../../adapters/kmsAdapter";
import crypto from "crypto";
import { jwtVerify, JWTVerifyResult, KeyLike } from "jose";
import { IPublicKeyGetter } from "./publicKeyGetter";

export class TokenService implements ITokenService {
  private readonly dependencies: ITokenServiceDependencies;

  constructor(dependencies: ITokenServiceDependencies) {
    this.dependencies = dependencies;
  }

  getSubFromToken = async (
    jwksEndpoint: string,
    encryptionKeyArn: string,
    jwe: string,
  ): Promise<Result<string>> => {
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
      jwksEndpoint,
      jwt,
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

    return successResult("");
  };

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

  private getJweComponents(jwe: string): Result<string[]> {
    const jweComponents = jwe.split(".");

    if (jweComponents.length !== 5) {
      return errorResult({
        errorMessage: "JWE does not consist of five components",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(jweComponents);
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
    jwksEndpoint: string,
    encryptionKeyArn: string,
    jwe: string,
  ) => Promise<Result<string>>;
}

export interface ITokenServiceDependencies {
  publicKeyGetter: () => IPublicKeyGetter;
}
