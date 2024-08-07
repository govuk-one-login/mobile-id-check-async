
import { IGetActiveSession, ICreateSession } from "../asyncCredential/sessionService/sessionService";
import { IDecodeToken, IVerifyTokenSignature, IDecodedToken } from "../asyncCredential/tokenService/tokenService";
import { IGetPartialRegisteredClientByClientId } from "../services/clientRegistryService/clientRegistryService";
import { errorResult, Result, successResult } from "../utils/result";

export class MockTokenServiceGetDecodedTokenErrorResult
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): Result<IDecodedToken> {
    return errorResult({
      errorMessage: "Mock decoding token error",
      errorCategory: "SERVER_ERROR",
    });
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(successResult(null));
  }
}

export class MockTokenServiceInvalidSignatureErrorResult
  implements IDecodeToken, IVerifyTokenSignature
{
  getDecodedToken(): Result<IDecodedToken> {
    return successResult({
      encodedJwt:
        "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
      jwtPayload: {
        aud: "mockIssuer",
        client_id: "mockClientId",
        exp: 1721901143000,
        iss: "mockIssuer",
        scope: "dcmaw.session.async_create",
      },
    });
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Failed to verify token signature",
        errorCategory: "SERVER_ERROR",
      }),
    );
  }
}

export class MockTokenServiceSuccess implements IDecodeToken, IVerifyTokenSignature {
  getDecodedToken(): Result<IDecodedToken> {
    return successResult({
      encodedJwt:
        "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
      jwtPayload: {
        aud: "mockIssuer",
        client_id: "mockClientId",
        exp: 1721901143000,
        iss: "mockIssuer",
        scope: "dcmaw.session.async_create",
      },
    });
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(successResult(null));
  }
}

export class MockClientRegistryServiceeGetPartialClientInternalServerResult
  implements IGetPartialRegisteredClientByClientId
{
  getPartialRegisteredClientByClientId = async () => {
    return errorResult({
      errorMessage: "Unexpected error retrieving registered client",
      errorCategory: "SERVER_ERROR",
    });
  };
}

export class MockClientRegistryServiceGetPartialClientBadRequestResponse
  implements IGetPartialRegisteredClientByClientId
{
  getPartialRegisteredClientByClientId = async () => {
    return errorResult({
      errorMessage: "Client Id is not registered",
      errorCategory: "CLIENT_ERROR",
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

export class MockSessionServiceGetSessionBySubErrorResult
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<Result<string | null>> => {
    return errorResult({
      errorMessage: "Mock failing DB call",
      errorCategory: "SERVER_ERROR",
    });
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockSessionServiceNoActiveSession
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }
  getActiveSession = async (): Promise<Result<string | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockSessionServiceGetActiveSessionSuccessResult
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<Result<string | null>> => {
    return successResult("mockSessionId");
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockSessionServiceCreateSessionErrorResult
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<Result<string | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return errorResult({
      errorMessage: "Mock error",
      errorCategory: "SERVER_ERROR",
    });
  };
}

export class MockSessionServiceCreateSessionSuccessResult
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;
  readonly indexName: string;

  constructor(tableName: string, indexName: string) {
    this.tableName = tableName;
    this.indexName = indexName;
  }

  getActiveSession = async (): Promise<Result<string | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

// IPV Core pact mocks
export class MockTokenServiceInvalidSignatureIPV implements IDecodeToken, IVerifyTokenSignature {
  getDecodedToken(): Result<IDecodedToken> {
    return successResult({
      encodedJwt:
        "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
      jwtPayload: {
        aud: "mockIssuer",
        client_id: "ipv-core",
        exp: 1721901143000,
        iss: "mockIssuer",
        scope: "dcmaw.session.async_create",
      },
    });
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(errorResult({
      errorMessage: "Signature is invalid",
      errorCategory: "CLIENT_ERROR",
    }));
  }
}

export class MockTokenServiceSuccessIPV implements IDecodeToken, IVerifyTokenSignature {
  getDecodedToken(): Result<IDecodedToken> {
    return successResult({
      encodedJwt:
        "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJleHAiOjE3MjE5MDExNDMwMDAsImlzcyI6Im1vY2tJc3N1ZXIiLCJhdWQiOiJtb2NrSXNzdWVyIiwic2NvcGUiOiJkY21hdy5zZXNzaW9uLmFzeW5jX2NyZWF0ZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.Ik_kbkTVKzlXadti994bAtiHaFO1KsD4_yJGt4wpjr8",
      jwtPayload: {
        aud: "mockIssuer",
        client_id: "ipv-core",
        exp: 1721901143000,
        iss: "mockIssuer",
        scope: "dcmaw.session.async_create",
      },
    });
  }
  verifyTokenSignature(): Promise<Result<null>> {
    return Promise.resolve(successResult(null));
  }
}

export class MockClientRegistryServiceGetPartialClientSuccessResultIPV
  implements IGetPartialRegisteredClientByClientId
{
  getPartialRegisteredClientByClientId = async () => {
    return successResult({
      issuer: "mockIssuer",
      redirectUri: "https://identity.staging.account.gov.uk/credential-issuer/callback?id=dcmawAsync",
    });
  };
}
