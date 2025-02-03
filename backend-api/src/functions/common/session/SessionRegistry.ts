import { DatabaseRecord } from "../../adapters/dynamoDbAdapter";
import { Result } from "../../utils/result";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";

export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<UpdateSessionSuccess, UpdateSessionFailure>>;
}

export interface UpdateSessionSuccess {
  attributes: DatabaseRecord | null;
}

export interface UpdateSessionFailure {
  failureType: UpdateSessionError;
  attributes: DatabaseRecord | null;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
}
