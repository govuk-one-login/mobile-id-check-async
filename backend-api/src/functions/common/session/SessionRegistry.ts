import { BaseSessionAttributes } from "../../adapters/dynamoDbAdapter";
import { Result } from "../../utils/result";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";

export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<UpdateSessionSuccess, UpdateSessionFailure>>;
}

export interface UpdateSessionSuccess {
  attributes: BaseSessionAttributes;
}

export type UpdateSessionFailure =
  | UpdateSessionFailureConditionalCheckFailure
  | UpdateSessionFailureInternalServerError;

export interface UpdateSessionFailureConditionalCheckFailure {
  errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE;
  attributes: BaseSessionAttributes;
}

export interface UpdateSessionFailureInternalServerError {
  errorType: UpdateSessionError.INTERNAL_SERVER_ERROR;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
}
