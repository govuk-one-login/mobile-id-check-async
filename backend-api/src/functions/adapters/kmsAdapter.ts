import {
  DecryptCommand,
  DecryptCommandOutput,
  KMSClient,
} from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const kmsClient = new KMSClient({
  region: "eu-west-2",
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});

export class KMSAdapter implements IKmsAdapter {
  private readonly keyId;

  constructor(keyId: string) {
    this.keyId = keyId;
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    let decryptCommandOutput: DecryptCommandOutput;
    try {
      decryptCommandOutput = await kmsClient.send(
        new DecryptCommand({
          KeyId: this.keyId,
          CiphertextBlob: ciphertext,
          EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
        }),
      );
    } catch (error) {
      throw new Error(`KMS decryption error: ${error}`);
    }

    if (decryptCommandOutput.Plaintext == null) {
      throw new Error("Decrypted plaintext data was null");
    }

    return decryptCommandOutput.Plaintext;
  }
}

export interface IKmsAdapter {
  decrypt: (ciphertext: Uint8Array) => Promise<Uint8Array>;
}
