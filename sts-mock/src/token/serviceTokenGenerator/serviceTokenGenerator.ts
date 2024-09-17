import { errorResult, Result, successResult } from "../../utils/result";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { importJWK, JWK, JWTPayload, SignJWT, KeyLike } from "jose";

export class ServiceTokenGenerator implements IServiceToken {
  private readonly stsMockBaseUrl: string;
  private readonly keyStorageBucket: string;
  private readonly subjectId: string;
  private readonly scope: string;
  private readonly tokenTimeToLive: number;
  private s3Client = new S3Client([
    {
      region: "eu-west-2",
      maxAttempts: 2,
    },
  ]);

  constructor(
    stsMockBaseUrl: string,
    keyStorageBucket: string,
    subjectId: string,
    scope: string,
    tokenTimeToLive: number,
  ) {
    this.stsMockBaseUrl = stsMockBaseUrl;
    this.keyStorageBucket = keyStorageBucket;
    this.subjectId = subjectId;
    this.scope = scope;
    this.tokenTimeToLive = tokenTimeToLive;
  }

  async generateServiceToken(): Promise<Result<string>> {
    const getPrivateKeyFromS3Result = await this.getPrivateKeyFromS3();
    if (getPrivateKeyFromS3Result.isError) {
      return getPrivateKeyFromS3Result;
    }

    const formatKeyAsKeyLikeResult = await this.formatKeyAsKeyLike(
      getPrivateKeyFromS3Result.value,
    );
    if (formatKeyAsKeyLikeResult.isError) {
      return formatKeyAsKeyLikeResult;
    }

    const tokenPayload = this.createServiceTokenPayload();

    const signingResult = await this.signServiceToken(
      tokenPayload,
      formatKeyAsKeyLikeResult.value,
    );
    if (signingResult.isError) {
      return signingResult;
    }

    return successResult(signingResult.value);
  }

  private async getPrivateKeyFromS3(): Promise<Result<string>> {
    const retrieveParams = {
      Bucket: this.keyStorageBucket,
      Key: "private-key.json",
    };
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand(retrieveParams),
      );
      return successResult(await response.Body!.transformToString());
    } catch {
      return errorResult({
        errorMessage: "Unable to fetch file from S3",
        errorCategory: "SERVER_ERROR",
      });
    }
  }

  private async formatKeyAsKeyLike(
    key: string,
  ): Promise<Result<KeyLike | Uint8Array>> {
    let privateKey;
    try {
      const jwk = JSON.parse(key) as JWK;
      privateKey = await importJWK(jwk);
    } catch {
      return errorResult({
        errorMessage: "Error formatting private key",
        errorCategory: "SERVER_ERROR",
      });
    }
    return successResult(privateKey);
  }

  private createServiceTokenPayload() {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return {
      aud: "TBC",
      iss: this.stsMockBaseUrl,
      sub: this.subjectId,
      iat: nowInSeconds,
      exp: nowInSeconds + this.tokenTimeToLive,
      scope: this.scope,
    };
  }

  private async signServiceToken(
    payload: JWTPayload,
    privateKey: KeyLike | Uint8Array,
  ): Promise<Result<string>> {
    let jwt;
    try {
      jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "ES256", typ: "JWT" })
        .sign(privateKey);
    } catch {
      return errorResult({
        errorMessage: "Error signing token",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(jwt);
  }
}

export interface IServiceToken {
  generateServiceToken: () => Promise<Result<string>>;
}
