import { KMSClient, SignCommand, SignCommandOutput } from "@aws-sdk/client-kms";
import { Buffer } from "buffer";
import { errorResult, Result, successResult } from "../../utils/result";

export class ServiceTokenGenerator implements toBeDefined {
    private readonly signingKeyId: string;
    private readonly encryptionKeyId: string;
    private kmsClient = new KMSClient([
        {
            region: "eu-west-2",
            maxAttempts: 2,
        },
    ]);

    constructor(signingKeyId: string, encryptionKeyId: string,) {
        this.signingKeyId = signingKeyId;
        this.encryptionKeyId = encryptionKeyId;
    }

    async generateServiceToken(): Promise<Result<string>> {

        const encodedHeader = this.base64Encode({
            alg: 'RS256',
            typ: 'JWT',
            kid: this.signingKeyId,
        })

        const encodedPayload = this.base64Encode(payload)

        const signingResult = await this.sign(
            `${encodedHeader}.${encodedPayload}`,
        )
        if (signingResult.isError) {
            return signingResult
        }

        return successResult(
            `${encodedHeader}.${encodedPayload}.${signingResult.value}`,
        )
    }

    private createServiceTokenPayload(
        stsMockBaseUrl: string,
        subjectId: string,
        scope: string,
    ) {
        const tokenTimeToLive =  180;
        const nowInSeconds = Math.floor(Date.now() / 1000)
        return {
            aud: "TBC",
            iss: stsMockBaseUrl,
            sub: subjectId,
            iat: nowInSeconds,
            exp: nowInSeconds + tokenTimeToLive,
            scope,
        }
    }

    private async sign(message: string): Promise<Result<string>> {
        let signResult: SignCommandOutput
        try {
            signResult = await this.kmsClient.send(
                new SignCommand({
                    Message: Buffer.from(message),
                    KeyId: this.signingKeyId,
                    SigningAlgorithm: "RSASSA_PSS_SHA_256",
                    MessageType: 'RAW',
                }),
            )
        } catch {
            return errorResult({
                errorMessage: "Error from KMS",
                errorCategory: "SERVER_ERROR",
            });
        }

        if (!signResult.Signature) {
            return errorResult({
                errorMessage: "No signature in response from KMS",
                errorCategory: "SERVER_ERROR",
            });
        }

        const signature = this.getFormattedSignature(signResult.Signature)

        return successResult(signature)
    }

    private getFormattedSignature(signature: Uint8Array) {
        return Buffer.from(signature).toString('base64url');
    }

    private base64Encode(object: object) {
        return Buffer.from(JSON.stringify(object)).toString('base64url')
    }
}


