import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import {
  getBaseSessionAttributes,
  getBiometricSessionFinishedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { oneHourAgoInMilliseconds } from "../../../../utils/utils";
import { GetSessionAttributesInvalidAttributesError } from "../../SessionRegistry/types";

export class BiometricSessionFinished extends UpdateSessionOperation {
  constructor(private readonly biometricSessionId: string) {
    super();
  }

  static readonly nextSessionState = SessionState.BIOMETRIC_SESSION_FINISHED;
  static readonly validPriorSessionStates = [
    SessionState.BIOMETRIC_TOKEN_ISSUED,
  ];

  getDynamoDbUpdateExpression() {
    return `set biometricSessionId = :biometricSessionId, sessionState = :${BiometricSessionFinished.nextSessionState}`;
  }

  getDynamoDbConditionExpression(): string {
    // Change to use the numeric createdAt comparison
    return `attribute_exists(sessionId) AND ${this.validPriorSessionStatesCondition()} AND createdAt > :oneHourAgoInMilliseconds`;
  }

  getDynamoDbExpressionAttributeValues() {
    const values = this.sessionStateAttributeValues(
      BiometricSessionFinished.nextSessionState,
      BiometricSessionFinished.validPriorSessionStates,
    );
    return {
      ...values,
      ":biometricSessionId": { S: this.biometricSessionId },
      ":oneHourAgoInMilliseconds": {
        N: oneHourAgoInMilliseconds().toString(),
      }, // Store as number
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
    options?: {
      operationFailed?: boolean;
    },
  ): Result<SessionAttributes, GetSessionAttributesInvalidAttributesError> {
    if (options?.operationFailed) {
      return getBaseSessionAttributes(item);
    } else {
      return getBiometricSessionFinishedSessionAttributes(item);
    }
  }

  getValidPriorSessionStates(): Array<string> {
    return BiometricSessionFinished.validPriorSessionStates;
  }
}
