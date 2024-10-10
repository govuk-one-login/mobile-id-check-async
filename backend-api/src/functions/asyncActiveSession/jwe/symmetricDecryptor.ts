import { createDecipheriv } from "node:crypto";

export class SymmetricDecryptor implements IDecryptSymmetric {
  async decrypt(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    additionalData: Buffer,
  ): Promise<string> {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(additionalData);
    decipher.setAuthTag(tag);

    let decryptedBuffer = decipher.update(ciphertext);
    decryptedBuffer = Buffer.concat([decryptedBuffer, decipher.final()]);

    return decryptedBuffer.toString();
  }
}

export interface IDecryptSymmetric {
  decrypt: (
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    additionalData: Buffer,
  ) => Promise<string>;
}
