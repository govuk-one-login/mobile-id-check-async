import { DatabaseRecord } from "../../adapters/dynamoDbAdapter";
import { Result } from "../../utils/result";
import { UpdateSessionOperation } from "./updateOperations/UpdateSessionOperation";

export interface SessionRegistry {
  updateSession(
    sessionId: string,
    updateOperation: UpdateSessionOperation,
  ): Promise<Result<void, UpdateSessionReturnType>>;
}

export interface UpdateSessionReturnType {
  failureType: UpdateSessionError;
  attributes: DatabaseRecord | null;
}

export enum UpdateSessionError {
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONDITIONAL_CHECK_FAILURE = "CONDITIONAL_CHECK_FAILURE",
}
