import { Result } from "../../utils/result";
import { GetSessionOperation } from "./getOperations/GetSessionOperation";
import { SessionAttributes, SessionState } from "./session";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";

export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<SessionUpdated, SessionUpdateFailed>>;

  getSession(
    sessionId: string,
    getOperation: GetSessionOperation,
  ): Promise<Result<SessionAttributes, GetSessionFailed>>;
}

// Update session

export interface SessionUpdated {
  attributes: SessionAttributes;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}

export type SessionUpdateFailed =
  | SessionUpdateFailedConditionalCheckFailure
  | SessionUpdateFailedInternalServerError
  | SessionUpdateFailedSessionNotFound;

interface SessionUpdateFailedConditionalCheckFailure {
  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE;
  attributes: SessionAttributes;
}

export interface SessionUpdateFailedInternalServerError {
  errorType: UpdateSessionError.INTERNAL_SERVER_ERROR;
}

interface SessionUpdateFailedSessionNotFound {
  errorType: UpdateSessionError.SESSION_NOT_FOUND;
}

export type UpdateOperationDataToLog =
  | UpdateExpressionDataToLog
  | UpdateSessionValidateSessionErrorData;

interface UpdateExpressionDataToLog {
  updateExpression: string;
  conditionExpression: string | undefined;
}

export interface UpdateSessionValidateSessionErrorData {
  invalidAttribute:
    | UpdateSessionInvalidSessionAttribute
    | BiometricSessionFinishedInvalidSessionAttribute;
}

interface UpdateSessionInvalidSessionAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_TOKEN_ISSUED>;
  createdAt?: number;
}

export interface BiometricSessionFinishedValidateSessionErrorData {
  invalidAttribute: BiometricSessionFinishedInvalidSessionAttribute;
}

interface BiometricSessionFinishedInvalidSessionAttribute {
  sessionState?: Exclude<SessionState, SessionState.BIOMETRIC_SESSION_FINISHED>;
  createdAt?: number;
}

// Get session

export enum GetSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CLIENT_ERROR = "CLIENT_ERROR",
}

export type GetSessionFailed =
  | GetSessionInternalServerError
  | GetSessionClientError;

export interface GetSessionInternalServerError {
  errorType: GetSessionError.INTERNAL_SERVER_ERROR;
}

export interface GetSessionClientError {
  errorType: GetSessionError.CLIENT_ERROR;
}

export interface GetSessionErrorSessionNotFound {
  errorType: GetSessionError.CLIENT_ERROR;
}

export interface GetSessionSessionInvalidErrorData {
  errorType: GetSessionError.CLIENT_ERROR;
  data: GetSessionValidateSessionErrorData;
}

export interface GetSessionValidateSessionErrorData {
  invalidAttributes?: ValidateSessionInvalidAttributes[];
  sessionAttributes?: InvalidSessionAttributes;
}

export interface ValidateSessionErrorInvalidAttributesData {
  invalidAttributes: ValidateSessionInvalidAttributes[];
}

export interface GetSessionAttributesInvalidAttributesError {
  sessionAttributes: InvalidSessionAttributes;
}

export interface ValidateSessionInvalidAttributes {
  sessionState?: SessionState;
  createdAt?: number;
}

export type InvalidSessionAttributes = unknown;

// Shared

export interface ValidateSessionAttributes {
  sessionState: SessionState;
  createdAt: number;
}
