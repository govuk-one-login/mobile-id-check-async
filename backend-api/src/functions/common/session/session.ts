import { DocumentType } from "../../types/document";

export enum SessionState {
  AUTH_SESSION_CREATED = "ASYNC_AUTH_SESSION_CREATED",
  BIOMETRIC_TOKEN_ISSUED = "ASYNC_BIOMETRIC_TOKEN_ISSUED",
  BIOMETRIC_SESSION_FINISHED = "ASYNC_BIOMETRIC_SESSION_FINISHED",
  AUTH_SESSION_ABORTED = "ASYNC_AUTH_SESSION_ABORTED",
  RESULT_SENT = "ASYNC_RESULT_SENT",
}

export type SessionAttributes =
  | BaseSessionAttributes
  | BiometricTokenIssuedSessionAttributes
  | BiometricSessionFinishedAttributes
  | AuthSessionAbortedAttributes;

export interface BaseSessionAttributes {
  clientId: string;
  clientState: string;
  createdAt: number;
  govukSigninJourneyId: string;
  issuer: string;
  sessionId: string;
  sessionState: SessionState;
  subjectIdentifier: string;
  timeToLive: number;
  redirectUri?: string;
}

export interface BiometricTokenIssuedSessionAttributes
  extends BaseSessionAttributes {
  documentType: DocumentType;
  opaqueId: string;
  sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED;
}

export interface BiometricSessionFinishedAttributes
  extends BaseSessionAttributes {
  documentType: DocumentType;
  opaqueId: string;
  sessionState: SessionState.BIOMETRIC_SESSION_FINISHED;
  biometricSessionId: string;
}
export interface AuthSessionAbortedAttributes extends BaseSessionAttributes {
  sessionState: SessionState.AUTH_SESSION_ABORTED;
}
