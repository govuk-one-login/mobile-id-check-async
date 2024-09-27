import { IKmsAdapter } from "../../adapters/kmsAdapter";
import { errorResult, Result, successResult } from "../../utils/result";

export class TokenService implements ITokenService {
  private readonly kmsAdapter: IKmsAdapter;

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

    const jweComponents = jwe.split(".");

    if (jweComponents.length !== 5) {
      return errorResult({
        errorMessage: "JWE does not consist of five components",
        errorCategory: "CLIENT_ERROR",
      });
    }

    // const [
    //   protectedHeader,
    //   encryptedCek,
    //   iv,
    //   ciphertext,
    //   tag
    // ] = jweComponents

    const encryptedCek = jweComponents[1];

    const getCekResult = await this.getCek(
      new Uint8Array(Buffer.from(encryptedCek, "base64")),
    );
    if (getCekResult.isError) {
      return errorResult({
        errorMessage: getCekResult.value.errorMessage,
        errorCategory: getCekResult.value.errorCategory,
      });
    }

    return successResult("");
  };

  private readonly fetchPublicKey = async (
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

  private async getCek(encryptedCek: Uint8Array): Promise<Result<Uint8Array>> {
    const decryptCekResult = await this.kmsAdapter.decrypt(encryptedCek);
    if (decryptCekResult.isError) {
      return errorResult({
        errorMessage: decryptCekResult.value.errorMessage,
        errorCategory: decryptCekResult.value.errorCategory,
      });
    }

    const cek = decryptCekResult.value.Plaintext ?? null;
    if (cek === null) {
      return errorResult({
        errorMessage:
          "No Plaintext received when calling KMS to decrypt the Content Encryption Key",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(cek);
  }
}

export interface ITokenService {
  getSubFromToken: (
    stsJwksEndpoint: string,
    jwe: string,
  ) => Promise<Result<string>>;
}
