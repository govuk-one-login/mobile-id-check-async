import { errorResult, Result, successResult } from "../../utils/result";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { importJWK, JWK, JWTPayload, SignJWT, KeyLike } from "jose";

export class ServiceTokenGenerator implements IServiceToken {
  private readonly issuer: string;
  private readonly bucketName: string;
  private readonly fileName: string;
  private readonly sub: string;
  private readonly scope: string;
  private readonly tokenExpiry: number;
  private s3Client = new S3Client([
    {
      region: "eu-west-2",
      maxAttempts: 2,
    },
  ]);

  constructor(
    stsMockBaseUrl: string,
    keyStorageBucketName: string,
    privateKeyFileName: string,
    serviceTokenTimeToLive: number,
    subjectId: string,
    scope: string,
  ) {
    this.issuer = stsMockBaseUrl;
    this.bucketName = keyStorageBucketName;
    this.fileName = privateKeyFileName;
    this.sub = subjectId;
    this.scope = scope;
    this.tokenExpiry = serviceTokenTimeToLive;
  }

  async generateServiceToken(): Promise<Result<string>> {
    const getPrivateKeyFromS3Result = await this.getPrivateKeyFromS3();
    if (getPrivateKeyFromS3Result.isError) {
      return getPrivateKeyFromS3Result;
    }

    const keyUnformatted = getPrivateKeyFromS3Result.value;
    const formatKeyResult = await this.formatKey(keyUnformatted);
    if (formatKeyResult.isError) {
      return formatKeyResult;
    }

    const tokenPayload = this.createServiceTokenPayload();

    const signServiceTokenResult = await this.signServiceToken(
      tokenPayload,
      formatKeyResult.value,
    );
    if (signServiceTokenResult.isError) {
      return signServiceTokenResult;
    }

    return successResult(signServiceTokenResult.value);
  }

  private async getPrivateKeyFromS3(): Promise<Result<string>> {
    const commandInput = {
      Bucket: this.bucketName,
      Key: this.fileName,
    };

    let response;
    try {
      response = await this.s3Client.send(new GetObjectCommand(commandInput));
    } catch {
      return errorResult({
        errorMessage: "Unable to fetch file from S3",
        errorCategory: "SERVER_ERROR",
      });
    }
    return successResult(await response.Body!.transformToString());
  }

  private async formatKey(key: string): Promise<Result<KeyLike | Uint8Array>> {
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
      iss: this.issuer,
      sub: this.sub,
      iat: nowInSeconds,
      exp: nowInSeconds + this.tokenExpiry,
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
