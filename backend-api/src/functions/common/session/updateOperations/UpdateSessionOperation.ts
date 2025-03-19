import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";
import {
  UpdateSessionValidateSessionErrorData,
  ValidateSessionAttributes,
} from "../SessionRegistry";

export interface UpdateSessionOperation {
  getDynamoDbUpdateExpression(): string;
  getDynamoDbConditionExpression(): string | undefined;
  getDynamoDbExpressionAttributeValues(): Record<string, AttributeValue>;
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
    options?: {
      operationFailed: boolean;
    },
  ): Result<SessionAttributes, void>;
  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, UpdateSessionValidateSessionErrorData>;
}
