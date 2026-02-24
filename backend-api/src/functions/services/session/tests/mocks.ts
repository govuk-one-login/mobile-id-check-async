import { mockSessionId } from "../../../testUtils/unitTestData";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";
import { ISessionService } from "../sessionService";
import { Session } from "../types";

export class MockSessionServiceGetErrorResult implements ISessionService {
  getActiveSession = async (): Promise<Result<Session | null>> => {
    return errorResult({
      errorMessage: "Mock error when getting session details",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult(mockSessionId);
  };
}

export class MockSessionServiceGetNullSuccessResult implements ISessionService {
  getActiveSession = async (): Promise<Result<Session | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult(mockSessionId);
  };
}

export class MockSessionServiceGetSuccessResult implements ISessionService {
  getActiveSession = async (): Promise<Result<Session | null>> => {
    return successResult({
      sessionId: mockSessionId,
      redirectUri: "https://mockUrl.com/redirect",
      state: "mockClientState",
      govukSigninJourneyId: "mockGovukSigninJourneyId",
    });
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult(mockSessionId);
  };
}

export class MockSessionServiceCreateSuccessResult implements ISessionService {
  getActiveSession = async (): Promise<Result<Session | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult(mockSessionId);
  };
}

export class MockSessionServiceCreateErrorResult implements ISessionService {
  getActiveSession = async (): Promise<Result<Session | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return errorResult({
      error: new Error("create session error"),
      errorMessage: "Mock error when creating session",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  };
}
