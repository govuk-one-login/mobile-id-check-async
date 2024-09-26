import { IKmsAdapter } from "../../adapters/kmsAdapter";
import { errorResult, Result, successResult } from "../../utils/result";

export class TokenService implements ITokenService {
  private kmsAdapter: IKmsAdapter;

  constructor(kmsAdapter: IKmsAdapter) {
    this.kmsAdapter = kmsAdapter;
  }

  getSubFromToken = async (
    stsJwksEndpoint: string,
    jwe: string,
  ): Promise<Result<string>> => {
    const fetchPublicKeyResult = await this.fetchPublicKey(stsJwksEndpoint);
    if (fetchPublicKeyResult.isError) {
      return errorResult({
        errorMessage: fetchPublicKeyResult.value.errorMessage,
        errorCategory: fetchPublicKeyResult.value.errorCategory,
      });
    }

    const jweComponents = jwe.split('.')

    if (jweComponents.length !== 5) {
      return errorResult({
        errorMessage: "JWE does not consist of five components",
        errorCategory: 'CLIENT_ERROR',
      });
    }

    const [
      protectedHeader,
      encryptedKey,
      iv,
      ciphertext,
      tag
    ] = jweComponents

    return successResult("");
  };

  private fetchPublicKey = async (
    stsJwksEndpoint: string,
  ): Promise<Result<JSON>> => {
    let response;
    try {
      response = await fetch(stsJwksEndpoint, {
        method: "GET",
      });
    } catch {
      return errorResult({
        errorMessage: "Unexpected error retrieving STS public key",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!response.ok) {
      return errorResult({
        errorMessage: "Error retrieving STS public key",
        errorCategory: "SERVER_ERROR",
      });
    }

    let publicKey;
    try {
      publicKey = await response.json();
    } catch {
      return errorResult({
        errorMessage: "Invalid JSON in response",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(publicKey);
  };

  private async getEncryptionKey(encryptedKey: Uint8Array): Promise<Result<Uint8Array>> {
    const decryptKeyResult = await this.kmsAdapter.decrypt(encryptedKey);
    if (decryptKeyResult.isError) {
      return errorResult({
        errorMessage: decryptKeyResult.value.errorMessage,
        errorCategory: decryptKeyResult.value.errorCategory,
      });
    }

    const encryptionKey = decryptKeyResult.value.Plaintext ?? null;
    if (encryptionKey === null) {
      return errorResult({
        errorMessage:
          "No Plaintext received when calling KMS to decrypt the Encryption Key",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(encryptionKey);
  }
}

export interface ITokenService {
  getSubFromToken: (stsJwksEndpoint: string, jwe: string) => Promise<Result<string>>;
}
