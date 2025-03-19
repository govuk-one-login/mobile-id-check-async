import { Result } from "../../utils/result";
import { GetSessionOperation } from "./getOperations/GetSessionOperation";
import {
  BaseSessionAttributes,
  SessionAttributes,
  SessionState,
} from "./session";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";
export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<SessionUpdated, SessionUpdateFailed>>;

  getSession(
    sessionId: string,
    getOperation: GetSessionOperation,
  ): Promise<Result<SessionAttributes, SessionRetrievalFailed>>;
}

// Update session
export interface SessionUpdated {
  attributes: SessionAttributes;
}

export type SessionUpdateFailed =
  | SessionUpdateFailedConditionalCheckFailure
  | SessionUpdateFailedInternalServerError
  | SessionUpdateFailedSessionNotFound;

export interface SessionUpdateFailedConditionalCheckFailure {
  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE;
  attributes: SessionAttributes;
}

export interface SessionUpdateFailedInternalServerError {
  errorType: UpdateSessionError.INTERNAL_SERVER_ERROR;
}

export interface SessionUpdateFailedSessionNotFound {
  errorType: UpdateSessionError.SESSION_NOT_FOUND;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}

export type UpdateOperationDataToLog =
  | UpdateExpressionDataToLog
  | UpdateSessionValidateSessionInvalidAttribute;

export interface UpdateSessionValidateSessionInvalidAttribute {
  invalidAttribute:
    | UpdateSessionInvalidSessionAttribute
    | BiometricSessionFinishedInvalidSessionAttribute;
}

export interface UpdateSessionInvalidSessionAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_TOKEN_ISSUED>;
  createdAt?: number;
}

export interface BiometricSessionFinishedValidateSessionInvalidAttribute {
  invalidAttribute: BiometricSessionFinishedInvalidSessionAttribute;
}

export interface BiometricSessionFinishedInvalidSessionAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_SESSION_FINISHED>;
  createdAt?: number;
}

interface UpdateExpressionDataToLog {
  updateExpression: string;
  conditionExpression: string | undefined;
}

// Get session

export type SessionRetrievalFailed =
  | SessionRetrievalFailedInternalServerError
  | SessionRetrievalFailedSessionNotFound
  | SessionRetrievalFailedSessionInvalid;

export interface SessionRetrievalFailedInternalServerError {
  errorType: GetSessionError.INTERNAL_SERVER_ERROR;
}

export interface SessionRetrievalFailedSessionNotFound {
  errorType: GetSessionError.SESSION_NOT_FOUND;
  errorMessage: string;
}

export interface SessionRetrievalFailedSessionInvalid {
  errorType: GetSessionError.SESSION_INVALID;
  data: SessionRetrievalFailedSessionInvalidData;
}

export interface SessionRetrievalFailedSessionInvalidData {
  invalidAttribute: SessionRetrievalInvalidSessionAttribute;
  sessionAttributes: Partial<BaseSessionAttributes>;
}

// export type ValidateSessionError = ValidateSessionInvalidAttribute | UpdateSessionInvalidSessionAttribute

export interface SessionRetrievalValidateSessionInvalidAttribute {
  invalidAttribute: SessionRetrievalInvalidSessionAttribute;
}

export interface SessionRetrievalInvalidSessionAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_TOKEN_ISSUED>;
  createdAt?: number;
}

export enum GetSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  SESSION_INVALID = "SESSION_INVALID",
}

export interface ValidateSessionAttributes {
  sessionState: SessionState;
  createdAt: number;
}
