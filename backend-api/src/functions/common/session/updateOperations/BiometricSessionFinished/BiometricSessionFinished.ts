import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import {
  getBiometricSessionFinishedSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { oneHourAgoInMilliseconds } from "../../../../utils/utils";
import { ValidateSessionErrorInvalidAttributeTypeData } from "../../SessionRegistry";

export class BiometricSessionFinished implements UpdateSessionOperation {
  constructor(private readonly biometricSessionId: string) {}

  getDynamoDbUpdateExpression() {
    return "set biometricSessionId = :biometricSessionId, sessionState = :biometricSessionFinished";
  }

  getDynamoDbConditionExpression(): string {
    // Change to use the numeric createdAt comparison
    return `attribute_exists(sessionId) AND sessionState = :biometricTokenIssued AND createdAt > :oneHourAgoInMilliseconds`;
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ":biometricSessionId": { S: this.biometricSessionId },
      ":biometricSessionFinished": {
        S: SessionState.BIOMETRIC_SESSION_FINISHED,
      },
      ":biometricTokenIssued": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
      ":oneHourAgoInMilliseconds": { N: oneHourAgoInMilliseconds().toString() }, // Store as number
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
    options?: {
      operationFailed?: boolean;
    },
  ): Result<SessionAttributes, ValidateSessionErrorInvalidAttributeTypeData> {
    if (options?.operationFailed) {
      return getBiometricTokenIssuedSessionAttributes(item);
    } else {
      return getBiometricSessionFinishedSessionAttributes(item);
    }
  }
}
