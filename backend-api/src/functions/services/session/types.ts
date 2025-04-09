export type Session = {
  sessionId: string;
  redirectUri?: string;
  state: string;
};

export type CreateSessionAttributes = {
  client_id: string;
  govuk_signin_journey_id: string;
  issuer: string;
  redirect_uri?: string;
  sessionDurationInSeconds: number;
  state: string;
  sub: string;
};
