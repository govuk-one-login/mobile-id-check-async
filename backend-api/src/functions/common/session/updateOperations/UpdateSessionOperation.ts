import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";

export interface UpdateSessionOperation {
  getDynamoDbUpdateExpression(): string;
  getDynamoDbConditionExpression(): string | undefined;
  getDynamoDbExpressionAttributeValues(): Record<string, AttributeValue>;
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void>;
}
