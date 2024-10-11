import { randomUUID } from "crypto";
import { errorResult, Result, successResult } from "../../utils/result";
import { DynamoDbAdapter } from "../../adapters/dynamoDbAdapter";

export interface ISessionService {
  createSession: (
    attributes: CreateSessionAttributes,
  ) => Promise<Result<string>>;
  getActiveSessionId: (
    subjectIdentifier: string,
  ) => Promise<Result<string | null>>;
  getActiveSession: (
    subjectIdentifier: string,
  ) => Promise<Result<Session | null>>;
}

export type CreateSessionAttributes = {
  client_id: string;
  govuk_signin_journey_id: string;
  issuer: string;
  redirect_uri?: string;
  sessionDurationInSeconds: number;
  state: string;
  sub: string;
};

export type Session = {
  sessionId: string;
  redirectUri?: string;
  state: string;
};

export class SessionService implements ISessionService {
  readonly dynamoDbAdapter: DynamoDbAdapter;

  constructor(tableName: string) {
    this.dynamoDbAdapter = new DynamoDbAdapter(tableName);
  }

  async createSession(
    attributes: CreateSessionAttributes,
  ): Promise<Result<string>> {
    const sessionId = randomUUID();

    try {
      await this.dynamoDbAdapter.createSession(attributes, sessionId);
    } catch (error) {
      return errorResult({
        errorMessage: `Error creating session - ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(sessionId);
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
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!record) {
      return successResult(null);
    }

    const sessionId = record.sessionId;
    if (!sessionId) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(sessionId);
  }

  async getActiveSession(
    subjectIdentifier: string,
  ): Promise<Result<Session | null>> {
    const attributesToGet = ["sessionId", "sessionState", "redirectUri"];

    let record;
    try {
      record = await this.dynamoDbAdapter.getActiveSession(
        subjectIdentifier,
        attributesToGet,
      );
    } catch (error) {
      return errorResult({
        errorMessage: `Error getting session - ${error}`,
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!record) {
      return successResult(null);
    }

    const redirectUri = record.redirectUri;
    const sessionId = record.sessionId;
    const sessionState = record.sessionState;
    if (!sessionId || !sessionState) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: "SERVER_ERROR",
      });
    }

    const session: Session = {
      sessionId,
      sessionState,
      ...(redirectUri && { redirectUri }),
    };

    return successResult(session);
  }
}
