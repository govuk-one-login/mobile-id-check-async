import {
    GetPublicKeyCommand,
    GetPublicKeyCommandOutput,
    KMSClient,
} from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { errorResult, Result, successResult } from "../../utils/result";

export class JwksBuilder implements IJwksBuilder {
    constructor(
        private readonly kmsClient = new KMSClient([
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

    async buildJwks(keyId: string): Promise<Result<string>> {
        // Get key from KMS
        let result: GetPublicKeyCommandOutput;
        try {
            const command = new GetPublicKeyCommand({
                KeyId: keyId,
            });
            result = await this.kmsClient.send(command);
        } catch (error) {
            // TODO: Question - why are errors not logged?
            return errorResult({
                errorMessage: "Error from KMS",
                errorCategory: "SERVER_ERROR",
            });
        }

        // TODO: Convert public key to JWKS
        // ...
        console.log(result)


        // TODO: Maybe split this method into two or three?

        return successResult("");
    }
}

export interface IJwksBuilder {
    buildJwks: (keyId: string) => Promise<Result<string>>;
}
