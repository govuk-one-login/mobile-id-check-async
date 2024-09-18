import { errorResult, Result, successResult } from "../../utils/result";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { importJWK, JWK, KeyLike } from "jose";

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
  ): Promise<Result<KeyLike | Uint8Array>> {
    const commandInput = {
      Bucket: bucketName,
      Key: fileName,
    };

    let keyUnformatted;
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand(commandInput),
      );
      keyUnformatted = await response.Body!.transformToString();
    } catch {
      return errorResult({
        errorMessage: "Error getting object from S3",
        errorCategory: "SERVER_ERROR",
      });
    }

    return await this.formatKey(keyUnformatted);
  }

  private async formatKey(key: string): Promise<Result<KeyLike | Uint8Array>> {
    try {
      const jwk = this.parseAsJwk(key);
      // Convert from JWK to a runtime-specific key representation (KeyLike).
      return successResult(await importJWK(jwk));
    } catch {
      return errorResult({
        errorMessage: "Error formatting key",
        errorCategory: "SERVER_ERROR",
      });
    }
  }

  private parseAsJwk(key: string): JWK {
    return JSON.parse(key) as JWK;
  }
}

export interface IKeyRetriever {
  getKey: (
    bucketName: string,
    fileName: string,
  ) => Promise<Result<KeyLike | Uint8Array>>;
}
