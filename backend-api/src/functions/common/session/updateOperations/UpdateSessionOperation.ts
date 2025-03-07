import { AttributeValue } from "@aws-sdk/client-dynamodb";

export interface UpdateSessionOperation {
  getDynamoDbUpdateExpression(): string;
  getDynamoDbConditionExpression(): string | undefined;
  getDynamoDbExpressionAttributeValues(): Record<string, AttributeValue>;
  // getSessionAttributesFromDynamoDbItem(
  //   item: Record<string, AttributeValue> | undefined,
  //   options?: {
  //     operationFailed: boolean;
  //   },
  // ): Result<SessionAttributes, void>;
}
