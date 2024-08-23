import { errorResult, Result, successResult } from "../../../utils/result";
import { IGetActiveSession, ICreateSession } from "../sessionService";

export class MockSessionServiceGetSessionBySubErrorResult
  implements IGetActiveSession, ICreateSession
{
  readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
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

  constructor(tableName: string) {
    this.tableName = tableName;
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

  constructor(tableName: string) {
    this.tableName = tableName;
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

  constructor(tableName: string) {
    this.tableName = tableName;
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

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  getActiveSession = async (): Promise<Result<string | null>> => {
    return successResult(null);
  };

  createSession = async (): Promise<Result<string>> => {
    return successResult("mockSessionId");
  };
}
