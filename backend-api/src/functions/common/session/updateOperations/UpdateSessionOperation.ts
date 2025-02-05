import {
  AttributeValue,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure,
} from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../../../adapters/dynamoDbAdapter";

export interface UpdateSessionOperation {
  getDynamoDbUpdateExpression(): string;
  getDynamoDbConditionExpression(): string | undefined;
  getDynamoDbExpressionAttributeValues(): Record<string, AttributeValue>;
  getDynamoDbReturnValues(): ReturnValue;
  getDynamoDbReturnValuesOnConditionCheckFailure(): ReturnValuesOnConditionCheckFailure;
  getSessionAttributes(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void>;
}
