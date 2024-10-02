import { IKmsAdapter } from "../../adapters/kmsAdapter";
import {
  RetryConfig,
  sendHttpRequest,
  SuccessfulHttpResponse,
} from "../../services/http/sendHttpRequest";
import { errorResult, Result, successResult } from "../../utils/result";
import { KMSAdapter } from "../../adapters/kmsAdapter";

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

      const decryptResult = await new KMSAdapter().decrypt(
          encryptionKeyArn,
          new Uint8Array(Buffer.from(encryptedCek, "base64")),
      );
      if (decryptResult.isError) {
          return decryptResult;
      }

      // const cek = decryptResult.value;

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
