import { fetchAdapter } from "../../adapters/fetchAdapter";
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
    const fetchPublicKeyResult =
      await this.fetchJwksWithRetries(stsJwksEndpoint);

    if (fetchPublicKeyResult.isError) {
      return fetchPublicKeyResult;
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

  private async fetchJwksWithRetries(
    stsJwksEndpoint: string,
  ): Promise<Result<IJwks>> {
    const maxRetries = 2;
    const delayInMs = 1000;

    let fetchPublicKeyResult: Result<IJwks> | undefined;

    for (let retries = 0; retries <= maxRetries; retries++) {
      fetchPublicKeyResult = await this.fetchJwks(stsJwksEndpoint);

      if (!fetchPublicKeyResult.isError) {
        return fetchPublicKeyResult;
      }

      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayInMs));
      }
    }

    // After all retries, check if fetchPublicKeyResult was assigned and handle the case where it was not assigned (should not happen)
    if (fetchPublicKeyResult == null) {
      return errorResult({
        errorMessage:
          "Unexpected error in retry policy when fetching STS public keys",
        errorCategory: "SERVER_ERROR",
      });
    }

    return fetchPublicKeyResult;
  }

  private readonly fetchJwks = async (
    stsJwksEndpoint: string,
  ): Promise<Result<IJwks>> => {
    let response;
    try {
      response = await fetchAdapter(stsJwksEndpoint, {
        method: "GET",
      });
    } catch {
      return errorResult({
        errorMessage: "Unexpected error retrieving STS public keys",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!response.ok) {
      return errorResult({
        errorMessage: "Error retrieving STS public keys",
        errorCategory: "SERVER_ERROR",
      });
    }

    let jwks;
    try {
      jwks = await response.json();
    } catch {
      return errorResult({
        errorMessage: "Invalid JSON in response",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!this.isJwks(jwks)) {
      return errorResult({
        errorMessage:
          "Response does not match the expected public key structure",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(jwks);
  };

  private isJwks = (data: unknown): data is IJwks => {
    return (
      typeof data === "object" &&
      data !== null &&
      "keys" in data &&
      Array.isArray((data as { keys: unknown }).keys) &&
      (data as { keys: unknown[] }).keys.every(
        (key) => typeof key === "object" && key !== null,
      )
    );
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

interface IJwks {
  keys: object[];
}
