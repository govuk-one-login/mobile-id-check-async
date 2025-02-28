import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { SessionState, SessionAttributes } from "../../session";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import {
  getBiometricSessionFinishedSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../sessionAttributes/sessionAttributes";
import { Result } from "../../../../utils/result";

export class BiometricSessionFinished implements UpdateSessionOperation {
  constructor(private readonly biometricSessionId: string) {}

  getDynamoDbUpdateExpression() {
    return "set biometricSessionId = :biometricSessionId, sessionState = :biometricSessionFinished";
  }

  getDynamoDbConditionExpression(): string {
    // Change to use the numeric createdAt comparison
    return `attribute_exists(sessionId) AND sessionState = :requiredState AND createdAt > :timeLimit`;
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ":biometricSessionId": { S: this.biometricSessionId },
      ":biometricSessionFinished": {
        S: SessionState.BIOMETRIC_SESSION_FINISHED,
      },
      ":requiredState": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
      ":timeLimit": { N: (Date.now() - 60 * 60 * 1000).toString() }, // Store as number
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
    options?: {
      operationFailed?: boolean;
    },
  ): Result<SessionAttributes, void> {
    if (options?.operationFailed) {
      return getBiometricTokenIssuedSessionAttributes(item);
    } else {
      return getBiometricSessionFinishedSessionAttributes(item);
    }
  }
}
