import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { errorResult, Result, successResult } from "../../utils/result";
import {PutObjectCommand, PutObjectCommandInput, S3Client} from "@aws-sdk/client-s3";

export class JwksUploader implements IJwksUploader {
        constructor(
        private readonly bucket: string,
        private readonly s3Client: S3Client = new S3Client([
            {
                region: "eu-west-2",
                maxAttempts: 2,
                requestHandler: new NodeHttpHandler({
                    connectionTimeout: 29000,
                    requestTimeout: 29000,
                }),
            },
        ])
    ) {}

    async uploadJwks(jwks: any): Promise<Result<string>> {
        const uploadParams: PutObjectCommandInput = {
            Body: jwks,
            Bucket: this.bucket,
            Key: '.well-known/jwks.json',
            ContentType: 'application.json',
        }

        try {
            await this.s3Client.send(new PutObjectCommand(uploadParams))
        } catch (error) {
            // TODO: Question - why are errors not logged?
            return errorResult({
                errorMessage: "Error from KMS",
                errorCategory: "SERVER_ERROR",
            });
        }

        return successResult("");
    }
}

export interface IJwksUploader {
    // TODO: Define jwks type
    uploadJwks: (jwks: any) => Promise<Result<string>>;
}
