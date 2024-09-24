import { errorResult, Result, successResult } from "../../utils/result";

export class TokenService implements ITokenService {
  getSubFromToken = async (
    stsJwksEndpoint: string,
  ): Promise<Result<string>> => {
    const fetchPublicKeyResult = await this.fetchPublicKey(stsJwksEndpoint);
    if (fetchPublicKeyResult.isError) {
      return errorResult({
        errorMessage: fetchPublicKeyResult.value.errorMessage,
        errorCategory: fetchPublicKeyResult.value.errorCategory,
      });
    }
    return successResult("");
  };

  private fetchPublicKey = async (
    stsJwksEndpoint: string,
  ): Promise<Result<string>> => {
    // let publicKey;
    let response;
    try {
      response = await fetch(stsJwksEndpoint, {
        method: "GET",
      });
      // publicKey = await response.json();
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

    return successResult("");
  };
}

export interface ITokenService {
  getSubFromToken: (stsJwksEndpoint: string) => Promise<Result<string>>;
}
