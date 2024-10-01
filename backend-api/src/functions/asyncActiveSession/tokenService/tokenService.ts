import { IKmsAdapter } from "../../adapters/kmsAdapter";
import {
  RetryConfig,
  sendHttpRequest,
} from "../../services/http/sendHttpRequest";
import { errorResult, Result, successResult } from "../../utils/result";

export class TokenService implements ITokenService {
  private readonly kmsAdapter: IKmsAdapter;

  constructor(kmsAdapter: IKmsAdapter) {
    this.kmsAdapter = kmsAdapter;
  }

  getSubFromToken = async (
    stsJwksEndpoint: string,
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
        errorMessage: "JWE does not consist of five components",
        errorCategory: "CLIENT_ERROR",
      });
    }

    // const [
    //   protectedHeader,
    //   encryptedCek,
    //   iv,
    //   ciphertext,
    //   tag
    // ] = jweComponents

    const encryptedCek = jweComponents[1];

    const getCekResult = await this.getCek(
      new Uint8Array(Buffer.from(encryptedCek, "base64")),
    );
    if (getCekResult.isError) {
      return getCekResult;
    }

    return successResult("");
  };

  private readonly isJwks = (data: unknown): data is IJwks => {
    return (
      typeof data === "object" &&
      data !== null &&
      "keys" in data &&
      Array.isArray((data as { keys: unknown }).keys) &&
      (data as { keys: unknown[] }).keys.every(
        (key) => typeof key === "object" && key !== null,
      )
    );
  };

  private async getCek(encryptedCek: Uint8Array): Promise<Result<Uint8Array>> {
    const decryptCekResult = await this.kmsAdapter.decrypt(encryptedCek);
    if (decryptCekResult.isError) {
      return decryptCekResult;
    }

    const cek = decryptCekResult.value.Plaintext ?? null;
    if (cek === null) {
      return errorResult({
        errorMessage:
          "No Plaintext received when calling KMS to decrypt the Content Encryption Key",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(cek);
  }

  private async getJwksFromResponse(
    response: Response,
  ): Promise<Result<IJwks>> {
    let jwks;
    try {
      jwks = await response.json();
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
