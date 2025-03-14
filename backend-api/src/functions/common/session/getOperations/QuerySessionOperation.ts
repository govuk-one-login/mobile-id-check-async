import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";

export interface QuerySessionOperation {
  getDynamoDbExpressionAttributeValues(
    sessionId: string,
  ): Record<string, AttributeValue>;
  getDynamoDbKeyConditionExpression(): string;
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void>;
}
