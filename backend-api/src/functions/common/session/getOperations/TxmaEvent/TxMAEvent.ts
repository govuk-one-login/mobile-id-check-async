import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import { getBiometricTokenIssuedSessionAttributes } from "../../updateOperations/sessionAttributes/sessionAttributes";
import { QuerySessionOperation } from "../QuerySessionOperation";

export class TxMAEvent implements QuerySessionOperation {
  getDynamoDbExpressionAttributeValues(
    sessionId: string,
  ): Record<string, AttributeValue> {
    return {
      ":sessionId": marshall(sessionId),
      ":sessionState": marshall(SessionState.BIOMETRIC_TOKEN_ISSUED),
      ":validFrom": marshall(getValidFromTime()),
    };
  }

  getDynamoDbKeyConditionExpression(): string {
    return "sessionId = :sessionId";
  }

  getDynamoDbFilterExpression(): string {
    return "sessionState = :sessionState and createdAt >= :validFrom";
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void> {
    return getBiometricTokenIssuedSessionAttributes(item);
  }
}

export function getValidFromTime() {
  const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
  return Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;
}
