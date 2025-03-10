import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes } from "../../session";
import { GetSessionOperation } from "../GetSessionOperation";
import { getBiometricTokenIssuedSessionAttributes } from "../../updateOperations/sessionAttributes/sessionAttributes";
import { marshall } from "@aws-sdk/util-dynamodb";

export class TxmaEvent implements GetSessionOperation {
  private readonly sessionId: string;

  constructor({ sessionId }: { sessionId: string }) {
    this.sessionId = sessionId;
  }

  getDynamoDbGetKeyExpression() {
    return { sessionId: marshall(this.sessionId) };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void> {
    return getBiometricTokenIssuedSessionAttributes(item);
  }
}
