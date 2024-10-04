import { errorResult, Result, successResult } from "../../../utils/result";
import { ISessionRepository, Session } from "../sessionRepository";

export class MockDynamoDbSessionRepositoryReadErrorResult
  implements ISessionRepository
{
  readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  read = async (): Promise<Result<Session | null>> => {
    return errorResult({
      errorMessage: "Mock error",
      errorCategory: "SERVER_ERROR",
    });
  };

  create = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockDynamoDbSessionRepositoryNoSessionFound
  implements ISessionRepository
{
  readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  read = async (): Promise<Result<Session | null>> => {
    return successResult(null);
  };

  create = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockDynamoDbSessionRepositorySessionFound
  implements ISessionRepository
{
  readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  read = async (): Promise<Result<Session | null>> => {
    return successResult({
      clientId: "mockClientId",
      govukSigninJourneyId: "govukSigninJourneyId",
      createdAt: 1710032400,
      issuer: "mockIssuer",
      sessionId: "mockSessionId",
      sessionState: "ASYNC_AUTH_SESSION_CREATED",
      state: "mockState",
      subjectIdentifier: "sub",
      timeToLive: 1710028800000,
    });
  };

  create = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockDynamoDbSessionRepositoryCreateErrorResult
  implements ISessionRepository
{
  readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  read = async (): Promise<Result<Session | null>> => {
    return successResult(null);
  };

  create = async (): Promise<Result<string>> => {
    return errorResult({
      errorMessage: "Mock error",
      errorCategory: "SERVER_ERROR",
    });
  };
}

export class MockDynamoDbSessionRepositorySessionCreated
  implements ISessionRepository
{
  readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  read = async (): Promise<Result<Session | null>> => {
    return successResult(null);
  };

  create = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}
