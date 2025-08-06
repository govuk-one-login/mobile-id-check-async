import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";
import { GetSessionAttributesInvalidAttributesError } from "../SessionRegistry/types";

export abstract class UpdateSessionOperation {
  abstract getDynamoDbUpdateExpression(): string;
  abstract getDynamoDbConditionExpression(): string | undefined;
  abstract getDynamoDbExpressionAttributeValues(): Record<
    string,
    AttributeValue
  >;
  abstract getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
    options?: {
      operationFailed: boolean;
    },
  ): Result<SessionAttributes, GetSessionAttributesInvalidAttributesError>;
  abstract getValidPriorSessionStates(): Array<string>;

  // Derived classes may use this to build a DynamoDB Condition Expression.
  validSessionStatesCondition(validPriorSessionStates: Array<string>) {
    return (
      "(" +
      validPriorSessionStates
        .map((state) => `sessionState = :${state}`)
        .join(" OR ") +
      ")"
    );
  }
}
