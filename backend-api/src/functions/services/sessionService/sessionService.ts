import { randomUUID } from "crypto";
import { Result } from "../../utils/result";
import { DynamoDbAdapter } from "../../adapters/dynamoDbAdapter";

export class SessionService implements ISessionService {
  readonly dynamoDbAdapter: DynamoDbAdapter;

  constructor(tableName: string) {
    this.dynamoDbAdapter = new DynamoDbAdapter(tableName);
  }

  async createSession(
    attributes: CreateSessionAttributes,
  ): Promise<Result<string>> {
    const sessionId = randomUUID();
    return await this.dynamoDbAdapter.createSession(attributes, sessionId);
  }

  async getActiveSessionId(
    subjectIdentifier: string,
  ): Promise<Result<string | null>> {
    return await this.dynamoDbAdapter.readSessionId(subjectIdentifier);
  }

  async getActiveSessionDetails(
    subjectIdentifier: string,
  ): Promise<Result<SessionDetails | null>> {
    return await this.dynamoDbAdapter.readSessionDetails(subjectIdentifier);
  }
}

export interface ISessionService {
  createSession: (
    attributes: CreateSessionAttributes,
  ) => Promise<Result<string>>;
  getActiveSessionId: (
    subjectIdentifier: string,
  ) => Promise<Result<string | null>>;
  getActiveSessionDetails: (
    subjectIdentifier: string,
  ) => Promise<Result<SessionDetails | null>>;
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

export type SessionDetails = {
  sessionId: string;
  redirectUri?: string;
  state: string;
};
