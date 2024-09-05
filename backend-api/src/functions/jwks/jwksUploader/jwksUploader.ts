import { NodeHttpHandler } from "@smithy/node-http-handler";
import { errorResult, Result, successResult } from "../../utils/result";
import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Jwks } from "../../types/jwks";

export class JwksUploader implements IJwksUploader {
  constructor(
    private readonly s3Client: S3Client = new S3Client([
      {
        region: "eu-west-2",
        maxAttempts: 2,
        requestHandler: new NodeHttpHandler({
          connectionTimeout: 29000,
          requestTimeout: 29000,
        }),
      },
    ]),
  ) {}

  async uploadJwks(
    jwks: Jwks,
    bucketName: string,
    fileName: string,
  ): Promise<Result<null>> {
    const uploadParams: PutObjectCommandInput = {
      Body: JSON.stringify(jwks),
      Bucket: bucketName,
      Key: fileName,
      ContentType: "application.json",
    };

    try {
      await this.s3Client.send(new PutObjectCommand(uploadParams));
    } catch {
      return errorResult({
        errorMessage: "Error uploading file to S3",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(null);
  }
}

export interface IJwksUploader {
  uploadJwks: (
    jwks: Jwks,
    bucketName: string,
    fileName: string,
  ) => Promise<Result<null>>;
}
