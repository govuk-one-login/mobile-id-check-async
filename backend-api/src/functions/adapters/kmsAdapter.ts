import {
  DecryptCommand,
  DecryptCommandOutput,
  KMSClient,
} from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { errorResult, Result, successResult } from "../utils/result";

export class KMSAdapter {
  private readonly kidArn: string;

  constructor(kidArn: string) {
    this.kidArn = kidArn;
  }

  async decrypt(
    encryptionKey: Uint8Array,
  ): Promise<Result<DecryptCommandOutput>> {
    let output: DecryptCommandOutput;
    try {
      output = await KmsClient.send(
        new DecryptCommand({
          KeyId: this.kidArn,
          CiphertextBlob: encryptionKey,
          EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
        }),
      );
    } catch {
      return errorResult({
        errorMessage: "Error decrypting encryption key",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(output);
  }
}

const KmsClient = new KMSClient({
  region: process.env.REGION,
  requestHandler: new NodeHttpHandler({
    requestTimeout: 29000,
    connectionTimeout: 5000,
  }),
  maxAttempts: 3,
});

export interface IKmsAdapter {
  decrypt: (encryptionKey: Uint8Array) => Promise<Result<DecryptCommandOutput>>;
}
