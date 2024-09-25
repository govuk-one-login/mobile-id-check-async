import {
  DecryptCommand,
  DecryptCommandOutput,
  KMSClient,
} from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export class KMSAdapter {
  private readonly kidArn: string;

  constructor(kidArn: string) {
    this.kidArn = kidArn;
  }

  async decrypt(encryptionKey: Uint8Array): Promise<Uint8Array> {
    const output: DecryptCommandOutput = await KmsClient.send(
      new DecryptCommand({
        KeyId: this.kidArn,
        CiphertextBlob: encryptionKey,
        EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
      }),
    );

    const plaintext = output.Plaintext ?? null;
    if (plaintext === null) {
      throw new Error(
        "No Plaintext received when calling KMS to decrypt the Encryption Key",
      );
    }
    return plaintext;
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
