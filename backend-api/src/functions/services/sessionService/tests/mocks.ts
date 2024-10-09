import { errorResult, Result, successResult } from "../../../utils/result";
import { ISessionService, SessionDetails } from "../sessionService";

export class MockSessionServiceGetErrorResult implements ISessionService {
  getActiveSessionId = async (): Promise<Result<string | null>> => {
    return errorResult({
      errorMessage: "Mock error when reading session ID",
      errorCategory: "SERVER_ERROR",
    });
  };

  getActiveSessionDetails = async (): Promise<
    Result<SessionDetails | null>
  > => {
    return errorResult({
      errorMessage: "Mock error when reading session details",
      errorCategory: "SERVER_ERROR",
    });
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockSessionServiceGetNullSuccessResult implements ISessionService {
  getActiveSessionId = async (): Promise<Result<string | null>> => {
    return successResult(null);
  };

  getActiveSessionDetails = async (): Promise<
    Result<SessionDetails | null>
  > => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockSessionServiceGetSuccessResult implements ISessionService {
  getActiveSessionId = async (): Promise<Result<string | null>> => {
    return successResult("mockSessionId");
  };

  getActiveSessionDetails = async (): Promise<
    Result<SessionDetails | null>
  > => {
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

export class MockSessionServiceCreateSuccessResult implements ISessionService {
  getActiveSessionId = async (): Promise<Result<string | null>> => {
    return successResult(null);
  };

  getActiveSessionDetails = async (): Promise<
    Result<SessionDetails | null>
  > => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}

export class MockSessionServiceCreateErrorResult implements ISessionService {
  getActiveSessionId = async (): Promise<Result<string | null>> => {
    return successResult(null);
  };

  getActiveSessionDetails = async (): Promise<
    Result<SessionDetails | null>
  > => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return errorResult({
      errorMessage: "Mock error when creating session",
      errorCategory: "SERVER_ERROR",
    });
  };
}
