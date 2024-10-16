import { createDecipheriv } from "node:crypto";

export class SymmetricDecrypter implements IDecryptSymmetric {
  decrypt(
    encryptionKey: Uint8Array,
    initializationVector: Uint8Array,
    encryptedData: Uint8Array,
    authenticationTag: Uint8Array,
    additionalAuthenticatedData: Buffer,
  ): string {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey,
      initializationVector,
    );
    decipher.setAAD(additionalAuthenticatedData);
    decipher.setAuthTag(authenticationTag);

    let decryptedBuffer = decipher.update(encryptedData);
    decryptedBuffer = Buffer.concat([decryptedBuffer, decipher.final()]);

    return decryptedBuffer.toString();
  }
}

export interface IDecryptSymmetric {
  decrypt: (
    encryptionKey: Uint8Array,
    initializationVector: Uint8Array,
    encryptedData: Uint8Array,
    authenticationTag: Uint8Array,
    additionalAuthenticatedData: Buffer,
  ) => string;
}
