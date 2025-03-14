import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";

export interface QuerySessionOperation {
  // getDynamoDbExpressionAttributeNames(): Record<string, string>;
  getDynamoDbExpressionAttributeValues(
    sessionId: string,
  ): Record<string, AttributeValue>;
  getDynamoDbKeyConditionExpression(): string;
  // getDynamoDbProjectionExpression(): string
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void>;
}
