import { IMintToken } from "../asyncToken/tokenService/tokenService";
import { IGetRegisteredIssuerUsingClientSecrets } from "../services/clientRegistryService/clientRegistryService";
import { Result, successResult, errorResult } from "../utils/result";

export class MockClientRegistryServiceSuccessResult
  implements IGetRegisteredIssuerUsingClientSecrets
{
  getRegisteredIssuerUsingClientSecrets = async (): Promise<Result<string>> => {
    return Promise.resolve(successResult("mockIssuer"));
  };
}

export class MockClientRegistryServiceInternalServerErrorResult
  implements IGetRegisteredIssuerUsingClientSecrets
{
  getRegisteredIssuerUsingClientSecrets = async (): Promise<Result<string>> => {
    return Promise.resolve(
      errorResult({
        errorMessage: "Unexpected error retrieving issuer",
        errorCategory: "SERVER_ERROR",
      }),
    );
  };
}

export class MockClientRegistryServiceBadRequestResult
  implements IGetRegisteredIssuerUsingClientSecrets
{
  getRegisteredIssuerUsingClientSecrets = async (): Promise<Result<string>> => {
    return Promise.resolve(
      errorResult({
        errorMessage: "Client secrets invalid",
        errorCategory: "CLIENT_ERROR",
      }),
    );
  };
}

export class MockTokenServiceSuccessResult implements IMintToken {
  async mintToken(): Promise<Result<string>> {
    return successResult("mockToken");
  }
}

export class MockTokenServiceErrorResult implements IMintToken {
  async mintToken(): Promise<Result<string>> {
    return errorResult({
      errorMessage: "Failed to sign Jwt",
      errorCategory: "SERVER_ERROR",
    });
  }
}
