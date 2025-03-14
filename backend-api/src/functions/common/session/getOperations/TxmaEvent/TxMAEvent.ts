import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import { getBiometricTokenIssuedSessionAttributes } from "../../updateOperations/sessionAttributes/sessionAttributes";
import { QuerySessionOperation } from "../QuerySessionOperation";

export class TxMAEvent implements QuerySessionOperation {
  getDynamoDbExpressionAttributeNames(): Record<string, string> {
    return {
      "#sessionState": "sessionState",
      "#createdAt": "createdAt",
    };
  }

  getDynamoDbExpressionAttributeValues(): Record<string, AttributeValue> {
    return {
      ":sessionState": marshall(SessionState.BIOMETRIC_TOKEN_ISSUED),
      ":validFrom": marshall(getValidFromTime()),
    };
  }

  getDynamoDbKeyConditionExpression(): string {
    return "#sessionState = :sessionState and #createdAt >= :validFrom";
  }

  // getDynamoDbProjectionExpression(): string {
  //   return ""
  // }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void> {
    return getBiometricTokenIssuedSessionAttributes(item);
  }
}

function getValidFromTime() {
  const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
  return Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;
}
