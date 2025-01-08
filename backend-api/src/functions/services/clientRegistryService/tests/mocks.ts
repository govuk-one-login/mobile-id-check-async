import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";
import {
  IGetPartialRegisteredClientByClientId,
  IGetRegisteredIssuerUsingClientSecrets,
} from "../clientRegistryService";

// Used by credential handler
export class MockClientRegistryServiceeGetPartialClientInternalServerResult
  implements IGetPartialRegisteredClientByClientId
{
  getPartialRegisteredClientByClientId = async () => {
    return errorResult({
      errorMessage: "Unexpected error retrieving registered client",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  };
}

export class MockClientRegistryServiceGetPartialClientBadRequestResponse
  implements IGetPartialRegisteredClientByClientId
{
  getPartialRegisteredClientByClientId = async () => {
    return errorResult({
      errorMessage: "Client Id is not registered",
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  };
}

export class MockClientRegistryServiceGetPartialClientSuccessResult
  implements IGetPartialRegisteredClientByClientId
{
  getPartialRegisteredClientByClientId = async () => {
    return successResult({
      issuer: "mockIssuer",
      redirectUri: "https://www.mockUrl.com",
    });
  };
}
export class MockClientRegistryServiceGetPartialClientSuccessResultIPV
  implements IGetPartialRegisteredClientByClientId
{
  getPartialRegisteredClientByClientId = async () => {
    return successResult({
      issuer: "mockIssuer",
      redirectUri:
        "https://identity.staging.account.gov.uk/credential-issuer/callback?id=dcmawAsync",
    });
  };
}

// Used by token handler
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
        errorCategory: ErrorCategory.SERVER_ERROR,
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
        errorCategory: ErrorCategory.CLIENT_ERROR,
      }),
    );
  };
}
