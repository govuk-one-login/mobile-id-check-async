import { SymmetricDecrypter, IDecryptSymmetric } from "./symmetricDecrypter";
import { errorResult, Result, successResult } from "../../utils/result";
import { IKmsAdapter, KMSAdapter } from "../../adapters/kmsAdapter";

export interface IDecryptJwe {
  decrypt: (jwe: string) => Promise<Result<string>>;
}

export type JweDecrypterDependencies = {
  asymmetricDecrypter: IKmsAdapter;
  symmetricDecrypter: IDecryptSymmetric;
};

const jweDecrypterDependencies: JweDecrypterDependencies = {
  asymmetricDecrypter: new KMSAdapter(),
  symmetricDecrypter: new SymmetricDecrypter(),
};

export class JweDecrypter implements IDecryptJwe {
  private readonly encryptionKeyId: string;
  private readonly asymmetricDecrypter: IKmsAdapter;
  private readonly symmetricDecrypter: IDecryptSymmetric;

  constructor(
    encryptionKeyId: string,
    dependencies = jweDecrypterDependencies,
  ) {
    this.encryptionKeyId = encryptionKeyId;
    this.asymmetricDecrypter = dependencies.asymmetricDecrypter;
    this.symmetricDecrypter = dependencies.symmetricDecrypter;
  }

  async decrypt(serializedJwe: string): Promise<Result<string>> {
    const jweComponents = serializedJwe.split(".");

    if (jweComponents.length !== 5) {
      return errorResult({
        errorMessage: "JWE is missing component",
        errorCategory: "CLIENT_ERROR",
      });
    }

    const [
      protectedHeader,
      encryptedKey,
      initializationVector,
      encryptedData,
      authenticationTag,
    ] = jweComponents;

    let cek: Uint8Array;
    try {
      cek = await this.asymmetricDecrypter.decrypt(
        Buffer.from(encryptedKey, "base64url"),
        this.encryptionKeyId,
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Unable to decrypt encryption key - ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    let payload: string;
    try {
      payload = this.symmetricDecrypter.decrypt(
        cek,
        Buffer.from(initializationVector, "base64url"),
        Buffer.from(encryptedData, "base64url"),
        Buffer.from(authenticationTag, "base64url"),
        Buffer.from(protectedHeader),
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Unable to decrypt payload - ${error}`,
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(payload);
  }
}
