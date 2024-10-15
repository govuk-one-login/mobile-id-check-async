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
  async decrypt(
    encryptedData: Uint8Array,
    encryptionKeyId: string,
  ): Promise<Uint8Array> {
    const decryptCommandOutput: DecryptCommandOutput = await kmsClient.send(
      new DecryptCommand({
        KeyId: encryptionKeyId,
        CiphertextBlob: encryptedData,
        EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
      }),
    );

    if (!decryptCommandOutput.Plaintext) {
      throw new Error("Decrypted plaintext data is missing");
    }

    return decryptCommandOutput.Plaintext;
  }
}

export interface IKmsAdapter {
  decrypt: (
    ciphertext: Uint8Array,
    encryptionKeyId: string,
  ) => Promise<Uint8Array>;
}
