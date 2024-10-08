import { errorResult, Result, successResult } from "../../../utils/result";
import { IDataStore, SessionDetails, SessionId } from "../datastore";

export class MockDynamoDbAdapterReadErrorResult implements IDataStore {
  readSessionId = async (): Promise<Result<SessionId | null>> => {
    return errorResult({
      errorMessage: "Mock error when reading session ID",
      errorCategory: "SERVER_ERROR",
    });
  };

  readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
    return errorResult({
      errorMessage: "Mock error when reading session details",
      errorCategory: "SERVER_ERROR",
    });
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockDynamoDbAdapterReadNullSuccessResult implements IDataStore {
  readSessionId = async (): Promise<Result<SessionId | null>> => {
    return successResult(null);
  };

  readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockDynamoDbAdapterReadSuccessResult implements IDataStore {
  readSessionId = async (): Promise<Result<SessionId | null>> => {
    return successResult("mockSessionId");
  };

  readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
    return successResult({
      sessionId: "mockSessionId",
      redirectUri: "https://mockUrl.com/redirect",
      state: "mockState",
    });
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockDynamoDbAdapterCreateSuccessResult implements IDataStore {
  readSessionId = async (): Promise<Result<SessionId | null>> => {
    return successResult(null);
  };

  readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockDynamoDbAdapterCreateErrorResult implements IDataStore {
  readSessionId = async (): Promise<Result<SessionId | null>> => {
    return successResult(null);
  };

  readSessionDetails = async (): Promise<Result<SessionDetails | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return errorResult({
      errorMessage: "Mock error when creating session",
      errorCategory: "SERVER_ERROR",
    });
  };
}
