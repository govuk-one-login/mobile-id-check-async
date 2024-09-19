import { errorResult, Result, successResult } from "../../utils/result";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPrivateKey, KeyObject, JsonWebKey } from "node:crypto";

export type SigningKey = {
  signingKey: KeyObject;
  keyId: string;
};

type PrivateKeyJwk = JsonWebKey & {
  kid: string;
  kty: "EC";
  crv: "P-256";
  d: string;
  x: string;
  y: string;
};

export interface IKeyRetriever {
  getKey: (bucketName: string, fileName: string) => Promise<Result<SigningKey>>;
}

export class KeyRetriever implements IKeyRetriever {
  private s3Client = new S3Client([
    {
      region: "eu-west-2",
      maxAttempts: 2,
    },
  ]);

  async getKey(
    bucketName: string,
    fileName: string,
  ): Promise<Result<SigningKey>> {
    const commandInput = {
      Bucket: bucketName,
      Key: fileName,
    };

    let key;
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand(commandInput),
      );
      key = await response.Body!.transformToString();
    } catch {
      return errorResult({
        errorMessage: "Error getting object from S3",
        errorCategory: "SERVER_ERROR",
      });
    }

    return await this.formatKeyAsKeyObject(key);
  }

  private async formatKeyAsKeyObject(key: string): Promise<Result<SigningKey>> {
    try {
      const jwk = this.parseAsJwk(key);

      // Convert from JWK to a runtime-specific key representation (KeyObject).
      const privateKey = createPrivateKey({ key: jwk, format: "jwk" });
      const keyId = jwk.kid;

      return successResult({ signingKey: privateKey, keyId });
    } catch {
      return errorResult({
        errorMessage: "Error formatting key",
        errorCategory: "SERVER_ERROR",
      });
    }
  }

  private parseAsJwk(key: string): PrivateKeyJwk {
    return JSON.parse(key) as PrivateKeyJwk;
  }
}
