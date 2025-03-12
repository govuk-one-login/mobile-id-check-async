import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes } from "../../session";
import { getBiometricTokenIssuedSessionAttributes } from "../../updateOperations/sessionAttributes/sessionAttributes";
import { GetSessionOperation } from "../GetSessionOperation";

export class TxMAEvent implements GetSessionOperation {
  getDynamoDbKeyExpression(sessionId: string) {
    return { sessionId: marshall(sessionId) };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void> {
    return getBiometricTokenIssuedSessionAttributes(item);
  }
}
