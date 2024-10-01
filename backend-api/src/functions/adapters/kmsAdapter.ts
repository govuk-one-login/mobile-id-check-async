import {
  DecryptCommand,
  DecryptCommandOutput,
  IncorrectKeyException,
  InvalidCiphertextException,
} from "@aws-sdk/client-kms";
import { errorResult, Result, successResult } from "../utils/result";
import { kmsClient } from "../clients/kmsClient";

export class KMSAdapter {
  async decrypt(
    keyArn: string,
    ciphertext: Uint8Array,
  ): Promise<Result<Uint8Array>> {
    let decryptCommandOutput: DecryptCommandOutput;
    try {
      decryptCommandOutput = await kmsClient.send(
        new DecryptCommand({
          KeyId: keyArn,
          CiphertextBlob: ciphertext,
          EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
        }),
      );
    } catch (error) {
      console.log(error);
      if (
        error instanceof InvalidCiphertextException ||
        error instanceof IncorrectKeyException
      ) {
        console.log("oi");

        return errorResult({
          errorMessage:
            "Encrypted data could not be decrypted with provided key",
          errorCategory: "CLIENT_ERROR",
        });
      } else {
        console.log("chao");

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
