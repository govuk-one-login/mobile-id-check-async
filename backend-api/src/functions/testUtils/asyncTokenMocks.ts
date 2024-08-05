import { IProcessRequest } from "../asyncToken/requestService/requestService";
import { IMintToken } from "../asyncToken/tokenService/tokenService";
import { IDecodedClientSecrets, IGetRegisteredIssuerUsingClientSecrets } from "../services/clientRegistryService/clientRegistryService";
import { Result, successResult, errorResult } from "../utils/result";

export class MockRequestServiceSuccessResult implements IProcessRequest {
  processRequest = (): Result<IDecodedClientSecrets> => {
    return successResult({
      clientId: "mockClientId",
      clientSecret: "mockClientSecret",
    });
  };
}

export class MockRequestServiceInvalidGrantTypeErrorResult implements IProcessRequest {
  processRequest = (): Result<IDecodedClientSecrets> => {
    return errorResult("Invalid grant_type");
  };
}

export class MockRequestServiceInvalidAuthorizationHeaderErrorResult
  implements IProcessRequest
{
  processRequest = (): Result<IDecodedClientSecrets> => {
    return errorResult("Invalid authorization header");
  };
}

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
    return Promise.resolve(errorResult("Unexpected error retrieving issuer"));
  };
}

export class MockClientRegistryServiceBadRequestResult
  implements IGetRegisteredIssuerUsingClientSecrets
{
  getRegisteredIssuerUsingClientSecrets = async (): Promise<Result<string>> => {
    return Promise.resolve(errorResult("Client secrets invalid"));
  };
}

export class MockTokenServiceSuccessResult implements IMintToken {
  async mintToken(): Promise<Result<string>> {
    return successResult("mockToken");
  }
}

export class MockTokenServiceErrorResult implements IMintToken {
  async mintToken(): Promise<Result<string>> {
    return errorResult("Failed to sign Jwt");
  }
}
