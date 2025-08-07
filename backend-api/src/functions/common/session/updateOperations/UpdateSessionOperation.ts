import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes, SessionState } from "../session";
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
  abstract getValidPriorSessionStates(): string[];

  // Derived classes may use this to build a DynamoDB Condition Expression.
  protected validPriorSessionStatesCondition(): string {
    return (
      "(" +
      this.getValidPriorSessionStates()
        .map((state) => `sessionState = :${state}`)
        .join(" OR ") +
      ")"
    );
  }

  // Derived classes may use this to produce DynamoDB Expression Attribute values.
  protected sessionStateAttributeValues(
    nextState: SessionState,
    validStates: Array<SessionState>,
  ): Record<string, AttributeValue> {
    const values: Record<string, AttributeValue> = {};
    [nextState, ...validStates].forEach((state) => {
      values[`:${state}`] = { S: state };
    });
    return values;
  }
}
