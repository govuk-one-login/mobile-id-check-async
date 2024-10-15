import {
  RetryConfig,
  sendHttpRequest,
  SuccessfulHttpResponse,
} from "../../services/http/sendHttpRequest";
import { errorResult, Result, successResult } from "../../utils/result";
import { jwtVerify, JWTVerifyResult, KeyLike } from "jose";
import { IJwks, IPublicKeyGetter } from "./publicKeyGetter";

export class TokenService implements ITokenService {
  private readonly dependencies: ITokenServiceDependencies;

  constructor(dependencies: ITokenServiceDependencies) {
    this.dependencies = dependencies;
  }

  getSubFromToken = async (
    stsJwksEndpoint: string,
    retryConfig: RetryConfig,
    jwt: string,
  ): Promise<Result<string>> => {
    const stsJwksEndpointResponseResult = await this.getJwks(
      stsJwksEndpoint,
      retryConfig,
    );
    if (stsJwksEndpointResponseResult.isError) {
      return stsJwksEndpointResponseResult;
    }

    const jwks = stsJwksEndpointResponseResult.value;

    const publicKeyGetter = this.dependencies.publicKeyGetter();
    const getPublicKeyFromJwksResult = await publicKeyGetter.getPublicKey(
      jwks,
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
    retryConfig: RetryConfig,
    jwt: string,
  ) => Promise<Result<string>>;
}

export interface ITokenServiceDependencies {
  publicKeyGetter: () => IPublicKeyGetter;
}
