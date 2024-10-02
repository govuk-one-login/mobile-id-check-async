import {
  DecryptCommand,
  DecryptCommandOutput,
  KMSClient,
} from "@aws-sdk/client-kms";
import { errorResult, Result, successResult } from "../utils/result";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export class KMSAdapter implements IKmsAdapter {
  private readonly kmsClient = new KMSClient([
    {
      region: "eu-west-2",
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 29000,
        requestTimeout: 29000,
      }),
    },
  ]);

  async decrypt(
    keyArn: string,
    ciphertext: Uint8Array,
  ): Promise<Result<Uint8Array>> {
    let decryptCommandOutput: DecryptCommandOutput;
    try {
      decryptCommandOutput = await this.kmsClient.send(
        new DecryptCommand({
          KeyId: keyArn,
          CiphertextBlob: ciphertext,
          EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
        }),
      );
    } catch {
      return errorResult({
        errorMessage: "Error decrypting data with KMS",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (decryptCommandOutput.Plaintext == null) {
      return errorResult({
        errorMessage: "Decrypted plaintext data was null",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(decryptCommandOutput.Plaintext);
  }
}

export interface IKmsAdapter {
  decrypt: (
    keyArn: string,
    ciphertext: Uint8Array,
  ) => Promise<Result<Uint8Array>>;
}
