import { Result } from "../../utils/result";

export interface ISessionRepository {
  create: (attributes: CreateSessionAttributes) => Promise<Result<string>>;
  read: (subjectIdentifier: string) => Promise<Result<Session | null>>;
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
  clientId: string;
  govukSigninJourneyId: string;
  createdAt: number;
  issuer: string;
  sessionId: string;
  sessionState: string;
  state: string;
  subjectIdentifier: string;
  timeToLive: number;
};
