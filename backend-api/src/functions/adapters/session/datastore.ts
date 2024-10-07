import { Result } from "../../utils/result";

export interface IDataStore {
  create: (attributes: CreateSessionAttributes) => Promise<Result<string>>;
  readSessionId: (
    subjectIdentifier: string,
  ) => Promise<Result<SessionId | null>>;
  readSessionDetails: (
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

export type SessionId = string;

export type SessionDetails = {
  sessionId: string;
  redirectUri?: string;
  state: string;
};
