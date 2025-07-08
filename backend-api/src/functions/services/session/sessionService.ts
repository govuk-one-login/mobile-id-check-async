import { randomUUID } from "crypto";
import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import {
  DynamoDbAdapter,
  DatabaseRecord,
} from "../../adapters/aws/dynamo/dynamoDbAdapter";
import { CreateSessionAttributes, Session } from "./types";

export interface ISessionService {
  createSession: (
    attributes: CreateSessionAttributes,
  ) => Promise<Result<string>>;
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
    attributes: CreateSessionAttributes,
  ): Promise<Result<string>> {
    const sessionId = randomUUID();

    try {
      await this.dynamoDbAdapter.createSession(attributes, sessionId);
    } catch (error) {
      return errorResult({
        errorMessage: `Error creating session - ${error}`,
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    return successResult(sessionId);
  }

  async getActiveSession(
    subjectIdentifier: string,
  ): Promise<Result<Session | null>> {
    const attributesToGet = [
      "sessionId",
      "clientState",
      "redirectUri",
      "govukSigninJourneyId",
    ];

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
    const govukSigninJourneyId = record.govukSigninJourneyId;
    if (!sessionId || !state || !govukSigninJourneyId) {
      return errorResult({
        errorMessage: "Session is malformed",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const session: Session = {
      sessionId,
      state,
      ...(record.redirectUri && { redirectUri: record.redirectUri }),
      govukSigninJourneyId,
    };

    return successResult(session);
  }
}
