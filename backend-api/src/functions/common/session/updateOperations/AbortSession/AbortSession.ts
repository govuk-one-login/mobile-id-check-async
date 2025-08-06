import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../../utils/result";
import {
  SessionAttributes,
  SessionState
} from "../../session";
import {
  getAuthSessionAbortedAttributes,
  getBaseSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { oneHourAgoInMilliseconds } from "../../../../utils/utils";
import { GetSessionAttributesInvalidAttributesError } from "../../SessionRegistry/types";

export class AbortSession extends UpdateSessionOperation {
  constructor(private readonly sessionId: string) {
    super();
  }

  static nextSessionState = SessionState.AUTH_SESSION_ABORTED;
  static validPriorSessionStates = [
    SessionState.AUTH_SESSION_CREATED,
    SessionState.BIOMETRIC_TOKEN_ISSUED,
  ];

  getDynamoDbUpdateExpression() {
    return `set sessionState = :${AbortSession.nextSessionState}`;
  }

  getDynamoDbConditionExpression(): string {
    return `attribute_exists(sessionId) AND 
            ${this.validSessionStatesCondition(AbortSession.validPriorSessionStates)} AND 
            createdAt > :oneHourAgoInMilliseconds`;
  }

  getDynamoDbExpressionAttributeValues() {
    const values: Record<string, AttributeValue> = {
      ":oneHourAgoInMilliseconds": { N: oneHourAgoInMilliseconds().toString() }, // Store as number
    };

    [
      AbortSession.nextSessionState,
      ...AbortSession.validPriorSessionStates,
    ].forEach((state) => {
      values[`:${state}`] = { S: state };
    });

    return values;
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

  getValidPriorSessionStates(): Array<string> {
    return AbortSession.validPriorSessionStates;
  }
}
