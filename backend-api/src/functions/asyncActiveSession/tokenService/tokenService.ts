import { errorResult, Result, successResult } from "../../utils/result";
import { KMSAdapter } from "../../adapters/kmsAdapter";

export class TokenService implements ITokenService {
  getSubFromToken = async (
    stsJwksEndpoint: string,
    encryptionKeyArn: string,
    jwe: string,
  ): Promise<Result<string>> => {
    const fetchPublicKeyResult = await this.fetchPublicKey(stsJwksEndpoint);
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

    const decryptResult = await new KMSAdapter().decrypt(
      encryptionKeyArn,
      new Uint8Array(Buffer.from(encryptedCek, "base64")),
    );
    if (decryptResult.isError) {
      return decryptResult;
    }

    const cek = decryptResult.value;
    console.log(cek);

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
}

export interface ITokenService {
  getSubFromToken: (
    stsJwksEndpoint: string,
    encryptionKeyArn: string,
    jwe: string,
  ) => Promise<Result<string>>;
}
