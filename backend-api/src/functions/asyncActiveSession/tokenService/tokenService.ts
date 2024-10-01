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
      await this.fetchPublicKeyWithRetries(stsJwksEndpoint);

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

  private async fetchPublicKeyWithRetries(
    stsJwksEndpoint: string,
  ): Promise<Result<IPublicKey>> {
    const maxRetries = 2;
    const delayInMs = 1000;

    let fetchPublicKeyResult: Result<IPublicKey> | undefined;

    for (let retries = 0; retries <= maxRetries; retries++) {
      fetchPublicKeyResult = await this.fetchPublicKey(stsJwksEndpoint);

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

  private readonly fetchPublicKey = async (
    stsJwksEndpoint: string,
  ): Promise<Result<IPublicKey>> => {
    let response;
    try {
      response = await fetchAdapter(stsJwksEndpoint, {
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

    if (!isPublicKey(publicKey)) {
      return errorResult({
        errorMessage:
          "Response does not match the expected public key structure",
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

interface IPublicKey {
  keys: Array<{
    kty: string;
    x: string;
    y: string;
    crv: string;
    d: string;
    kid: string;
  }>;
}

const isPublicKey = (publicKey: unknown): publicKey is IPublicKey => {
  if (
    typeof publicKey === "object" &&
    publicKey !== null &&
    hasKeysProperty(publicKey)
  ) {
    const { keys } = publicKey;
    if (Array.isArray(keys)) {
      return keys.every(isValidKey);
    }
  }
  return false;
};

const hasKeysProperty = (data: object): data is { keys: unknown } => {
  return "keys" in data;
};

const isValidKey = (key: unknown): key is IPublicKey["keys"][number] => {
  if (typeof key !== "object" || key === null) {
    return false;
  }
  return (
    hasStringProperty(key, "kty") &&
    hasStringProperty(key, "x") &&
    hasStringProperty(key, "y") &&
    hasStringProperty(key, "crv") &&
    hasStringProperty(key, "d") &&
    hasStringProperty(key, "kid")
  );
};

const hasStringProperty = (
  obj: object,
  property: string,
): obj is { [key in typeof property]: string } => {
  return (
    property in obj &&
    typeof (obj as { [key: string]: unknown })[property] === "string"
  );
};
