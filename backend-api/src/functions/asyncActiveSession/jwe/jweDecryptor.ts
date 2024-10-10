import { SymmetricDecryptor, IDecryptSymmetric } from "./symmetricDecryptor";
import { errorResult, Result, successResult } from "../../utils/result";
import { IDecryptAsymmetric, KMSAdapter } from "../../adapters/kmsAdapter";

export interface IDecryptJwe {
  decrypt: (jwe: string) => Promise<Result<string>>;
}

export type JweDecryptorDependencies = {
  asymmetricDecryptor: IDecryptAsymmetric;
  symmetricDecryptor: IDecryptSymmetric;
};

const jweDecryptorDependencies: JweDecryptorDependencies = {
  asymmetricDecryptor: new KMSAdapter(),
  symmetricDecryptor: new SymmetricDecryptor(),
};

export class JweDecryptor implements IDecryptJwe {
  private readonly encryptionKeyId: string;
  private readonly asymmetricDecryptor: IDecryptAsymmetric;
  private readonly symmetricDecryptor: IDecryptSymmetric;

  constructor(
    encryptionKeyId: string,
    dependencies = jweDecryptorDependencies,
  ) {
    this.encryptionKeyId = encryptionKeyId;
    this.asymmetricDecryptor = dependencies.asymmetricDecryptor;
    this.symmetricDecryptor = dependencies.symmetricDecryptor;
  }

  async decrypt(serializedJwe: string): Promise<Result<string>> {
    const jweComponents = serializedJwe.split(".");

    if (jweComponents.length !== 5) {
      return errorResult({
        errorMessage: "Error decrypting JWE: Missing component",
        errorCategory: "CLIENT_ERROR",
      });
    }

    const [protectedHeader, encryptedKey, iv, ciphertext, tag] = jweComponents;

    let cek: Uint8Array;
    try {
      cek = await this.asymmetricDecryptor.decrypt(
        Buffer.from(encryptedKey, "base64url"),
        this.encryptionKeyId,
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Error decrypting JWE: Unable to decrypt encryption key: ${error}`,
        errorCategory: "CLIENT_ERROR",
      });
    }

    let payload: string;
    try {
      payload = await this.symmetricDecryptor.decrypt(
        cek,
        Buffer.from(iv, "base64url"),
        Buffer.from(ciphertext, "base64url"),
        Buffer.from(tag, "base64url"),
        Buffer.from(protectedHeader),
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Error decrypting JWE: Unable to decrypt payload: ${error}`,
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(payload);
  }
}
