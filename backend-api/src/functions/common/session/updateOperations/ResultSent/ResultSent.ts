import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import { getBiometricSessionFinishedSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { GetSessionAttributesInvalidAttributesError } from "../../SessionRegistry/types";

export class ResultSent implements UpdateSessionOperation {
  constructor(private readonly sessionId: string) {}

  getDynamoDbUpdateExpression() {
    return "set sessionState = :resultSent";
  }

  // This prevents trying to accidentally create a session past the ttl (e.g. redriving the DLQ 24 hours later)
  getDynamoDbConditionExpression(): string {
    return `attribute_exists(sessionId)`;
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ":resultSent": {
        S: SessionState.RESULT_SENT,
      },
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<SessionAttributes, GetSessionAttributesInvalidAttributesError> {
    return getBiometricSessionFinishedSessionAttributes(item);
  }
}
