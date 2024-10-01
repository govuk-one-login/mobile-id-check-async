import {
  DecryptCommand,
  DecryptCommandOutput,
  IncorrectKeyException,
  InvalidCiphertextException,
  KMSClient,
} from "@aws-sdk/client-kms";
import { errorResult, Result, successResult } from "../utils/result";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

export class KMSAdapter {
  private kmsClient = new KMSClient([
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
    } catch (error) {
      if (
        error instanceof InvalidCiphertextException ||
        error instanceof IncorrectKeyException
      ) {
        return errorResult({
          errorMessage:
            "Encrypted data could not be decrypted with provided key",
          errorCategory: "CLIENT_ERROR",
        });
      } else {
        return errorResult({
          errorMessage: "Error decrypting data with KMS",
          errorCategory: "SERVER_ERROR",
        });
      }
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
