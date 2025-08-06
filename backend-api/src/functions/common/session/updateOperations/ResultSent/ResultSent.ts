import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import { getBiometricSessionFinishedSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { GetSessionAttributesInvalidAttributesError } from "../../SessionRegistry/types";

export class ResultSent extends UpdateSessionOperation {
  constructor(private readonly sessionId: string) {
    super();
  }

  static readonly nextSessionState = SessionState.RESULT_SENT;
  static readonly validPriorSessionStates = [];

  getDynamoDbUpdateExpression() {
    return `set sessionState = :${ResultSent.nextSessionState}`;
  }

  // This prevents trying to accidentally create a session past the ttl (e.g. redriving the DLQ 24 hours later)
  getDynamoDbConditionExpression(): string {
    return `attribute_exists(sessionId)`;
  }

  getDynamoDbExpressionAttributeValues() {
    return this.sessionStateAttributeValues(
      ResultSent.nextSessionState,
      ResultSent.validPriorSessionStates,
    );
  }

  // This function has been added to satisfy the interface. The issueBiometricCredential lambda that uses this operation does not need the output from Dynamo - it performs a GetItem operation earlier in the lambda flow. Rather than make a wider refactor to the UpdateOperation interface, we have decided to follow this approach for now, acknowledging that it isn't the best solution.
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<SessionAttributes, GetSessionAttributesInvalidAttributesError> {
    return getBiometricSessionFinishedSessionAttributes(item);
  }

  getValidPriorSessionStates(): string[] {
    return ResultSent.validPriorSessionStates;
  }
}
