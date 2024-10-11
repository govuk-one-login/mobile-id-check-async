import { errorResult, Result, successResult } from "../../../utils/result";
import { ISessionService, Session } from "../sessionService";

export class MockSessionServiceGetErrorResult implements ISessionService {
  getActiveSessionId = async (): Promise<Result<string | null>> => {
    return errorResult({
      errorMessage: "Mock error when getting session ID",
      errorCategory: "SERVER_ERROR",
    });
  };

  getActiveSession = async (): Promise<Result<Session | null>> => {
    return errorResult({
      errorMessage: "Mock error when getting session details",
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

  getActiveSession = async (): Promise<Result<Session | null>> => {
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

  getActiveSession = async (): Promise<Result<Session | null>> => {
    return successResult({
      sessionId: "mockSessionId",
      redirectUri: "https://mockUrl.com/redirect",
      state: "mockClientState",
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

  getActiveSession = async (): Promise<Result<Session | null>> => {
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

  getActiveSession = async (): Promise<Result<Session | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return errorResult({
      errorMessage: "Mock error when creating session",
      errorCategory: "SERVER_ERROR",
    });
  };
}
