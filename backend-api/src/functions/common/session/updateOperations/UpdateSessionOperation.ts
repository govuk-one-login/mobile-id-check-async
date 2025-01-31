import {
  AttributeValue,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure,
} from "@aws-sdk/client-dynamodb";

export interface UpdateSessionOperation {
  getDynamoDbUpdateExpression(): string;
  getDynamoDbConditionExpression(): string | undefined;
  getDynamoDbExpressionAttributeValues(): Record<string, AttributeValue>;
  getDynamoDbReturnValues(): ReturnValue;
  getDynamoDbReturnValuesOnConditionCheckFailure(): ReturnValuesOnConditionCheckFailure;
}
