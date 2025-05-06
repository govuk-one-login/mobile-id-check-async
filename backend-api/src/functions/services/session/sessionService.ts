import {
  emptySuccess,
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import {
  DynamoDbAdapter,
  DatabaseRecord,
} from "../../adapters/aws/dynamo/dynamoDbAdapter";
import { Session } from "./types";
import { BaseSessionAttributes } from "../../common/session/session";

export interface ISessionService {
  createSession: (
    sessionAttributes: BaseSessionAttributes,
  ) => Promise<Result<void>>;
  getActiveSessionId: (
    subjectIdentifier: string,
  ) => Promise<Result<string | null>>;
  getActiveSession: (
    subjectIdentifier: string,
  ) => Promise<Result<Session | null>>;
}

export class SessionService implements ISessionService {
  readonly dynamoDbAdapter: DynamoDbAdapter;

  constructor(tableName: string) {
    this.dynamoDbAdapter = new DynamoDbAdapter(tableName);
  }

  async createSession(
    sessionAttributes: BaseSessionAttributes,
  ): Promise<Result<void>> {
    try {
      await this.dynamoDbAdapter.createSession(sessionAttributes);
    } catch (error) {
      return errorResult({
        errorMessage: `Error creating session - ${error}`,
      });
    }

    return emptySuccess();
  }

  async getActiveSessionId(
    subjectIdentifier: string,
  ): Promise<Result<string | null>> {
    const attributesToGet = ["sessionId"];

    let record;
    try {
      record = await this.dynamoDbAdapter.getActiveSession(
        subjectIdentifier,
        attributesToGet,
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Error getting session ID - ${error}`,
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    if (!record) {
      return successResult(null);
    }

    const sessionId = record.sessionId;
    if (!sessionId) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    return successResult(sessionId);
  }

  async getActiveSession(
    subjectIdentifier: string,
  ): Promise<Result<Session | null>> {
    const attributesToGet = ["sessionId", "clientState", "redirectUri"];

    let record: DatabaseRecord | null;
    try {
      record = await this.dynamoDbAdapter.getActiveSession(
        subjectIdentifier,
        attributesToGet,
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Error getting session - ${error}`,
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    if (!record) {
      return successResult(null);
    }

    const sessionId = record.sessionId;
    const state = record.clientState;
    if (!sessionId || !state) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const session: Session = {
      sessionId,
      state,
      ...(record.redirectUri && { redirectUri: record.redirectUri }),
    };

    return successResult(session);
  }
}
