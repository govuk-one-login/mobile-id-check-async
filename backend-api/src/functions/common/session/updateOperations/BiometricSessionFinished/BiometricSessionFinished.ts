import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import {
  isOlderThan60minutes,
  SessionAttributes,
  SessionState,
} from "../../session";
import {
  getBiometricSessionFinishedSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import {
  BiometricSessionFinishedValidateSessionErrorData,
  ValidateSessionAttributes,
} from "../../SessionRegistry";
import { UpdateSessionOperation } from "../UpdateSessionOperation";

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

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, BiometricSessionFinishedValidateSessionErrorData> {
    const { sessionState, createdAt } = attributes;

    if (
      !sessionState ||
      sessionState !== SessionState.BIOMETRIC_SESSION_FINISHED
    ) {
      return errorResult({
        invalidAttribute: { sessionState },
      });
    }

    if (!createdAt || isOlderThan60minutes(createdAt)) {
      return errorResult({
        invalidAttribute: { createdAt },
      });
    }

    return emptySuccess();
  }
}
