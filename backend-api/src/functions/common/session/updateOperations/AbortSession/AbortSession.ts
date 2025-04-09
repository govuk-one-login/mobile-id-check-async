import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import {
  getAuthSessionAbortedAttributes,
  getBaseSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { oneHourAgoInMilliseconds } from "../../../../utils/utils";
import { GetSessionAttributesInvalidAttributesError } from "../../SessionRegistry/types";

export class AbortSession implements UpdateSessionOperation {
  constructor(private readonly sessionId: string) {}

  getDynamoDbUpdateExpression() {
    return "set sessionState = :abortedState";
  }

  getDynamoDbConditionExpression(): string {
    return `attribute_exists(sessionId) AND 
            (sessionState = :authCreatedState OR sessionState = :biometricTokenIssuedState) AND 
            createdAt > :oneHourAgoInMilliseconds`;
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ":abortedState": {
        S: SessionState.AUTH_SESSION_ABORTED,
      },
      ":authCreatedState": { S: SessionState.AUTH_SESSION_CREATED },
      ":biometricTokenIssuedState": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
      ":oneHourAgoInMilliseconds": { N: oneHourAgoInMilliseconds().toString() }, // Store as number
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
    options?: {
      operationFailed?: boolean;
    },
  ): Result<SessionAttributes, GetSessionAttributesInvalidAttributesError> {
    if (options?.operationFailed) {
      // Return the original session state based on the item
      if (item.sessionState?.S === SessionState.BIOMETRIC_TOKEN_ISSUED) {
        return getBiometricTokenIssuedSessionAttributes(item);
      }
      // If it's in AUTH_SESSION_CREATED state or any other state, use base attributes
      return getBaseSessionAttributes(item);
    } else {
      // For successful updates to AUTH_SESSION_ABORTED
      return getAuthSessionAbortedAttributes(item);
    }
  }
}
