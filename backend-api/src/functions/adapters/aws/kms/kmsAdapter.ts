import {
  DecryptCommand,
  DecryptCommandOutput,
  IncorrectKeyException,
  InvalidCiphertextException,
} from "@aws-sdk/client-kms";
import { kmsClient } from "./kmsClient";

export interface IKmsAdapter {
  decrypt: (
    ciphertext: Uint8Array,
    encryptionKeyId: string,
  ) => Promise<Uint8Array>;
}

export class KMSAdapter implements IKmsAdapter {
  async decrypt(
    encryptedData: Uint8Array,
    encryptionKeyId: string,
  ): Promise<Uint8Array> {
    let decryptCommandOutput: DecryptCommandOutput;
    try {
      decryptCommandOutput = await kmsClient.send(
        new DecryptCommand({
          KeyId: encryptionKeyId,
          CiphertextBlob: encryptedData,
          EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
        }),
      );
    } catch (error) {
      if (
        error instanceof InvalidCiphertextException ||
        error instanceof IncorrectKeyException
      ) {
        throw new ClientError(error.name);
      }
      throw error;
    }

    if (!decryptCommandOutput.Plaintext) {
      throw new Error("Decrypted plaintext data is missing");
    }

    return decryptCommandOutput.Plaintext;
  }
}

export class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}
