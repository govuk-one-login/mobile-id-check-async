import { Result } from "../../utils/result";
import { QuerySessionOperation } from "./getOperations/QuerySessionOperation";
import { SessionAttributes } from "./session";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";
export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<SessionUpdated, SessionUpdateFailed>>;

  querySession(
    sessionId: string,
    queryOperation: QuerySessionOperation,
  ): Promise<Result<SessionAttributes, SessionRetrievalFailed>>;
}

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

export interface UpdateExpressionDataToLog {
  updateExpression: string;
  conditionExpression: string | undefined;
}

export type SessionRetrievalFailed =
  | SessionRetrievalFailedInternalServerError
  | SessionRetrievalFailedSessionNotFound;

export interface SessionRetrievalFailedInternalServerError {
  errorType: QuerySessionError.INTERNAL_SERVER_ERROR;
}

export interface SessionRetrievalFailedSessionNotFound {
  errorType: QuerySessionError.SESSION_NOT_FOUND;
}

export enum QuerySessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}

export interface GetItemCommandDataToLog {
  Key: {
    S: { sessionId: string };
  };
}
