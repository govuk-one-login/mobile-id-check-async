import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes } from "../../session";
import { getBiometricTokenIssuedSessionAttributes } from "../../updateOperations/sessionAttributes/sessionAttributes";
import { QuerySessionOperation } from "../QuerySessionOperation";

export class TxMAEvent implements QuerySessionOperation {
  getDynamoDbExpressionAttributeValues(
    sessionId: string,
  ): Record<string, AttributeValue> {
    return {
      ":sessionId": marshall(sessionId),
    };
  }

  getDynamoDbKeyConditionExpression(): string {
    return "sessionId = :sessionId";
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void> {
    return getBiometricTokenIssuedSessionAttributes(item);
  }
}
