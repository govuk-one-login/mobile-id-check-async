import { errorResult, Result, successResult } from "../../utils/result";
import { jwtVerify, JWTVerifyResult, KeyLike } from "jose";
import {IPublicKeyGetter} from "./publicKeyGetter";

export class TokenService implements ITokenService {
  private readonly dependencies: ITokenServiceDependencies;

  constructor(dependencies: ITokenServiceDependencies) {
    this.dependencies = dependencies;
  }

  getSubFromToken = async (
      jwksEndpoint: string,
    jwt: string,
  ): Promise<Result<string>> => {
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
    jwt: string,
  ) => Promise<Result<string>>;
}

export interface ITokenServiceDependencies {
  publicKeyGetter: () => IPublicKeyGetter;
}
