import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Result } from "../../../../utils/result";
import { SessionAttributes } from "../../session";
import { getBiometricTokenIssuedSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import { GetSessionOperation } from "../GetSessionOperation";

export class TxMAEvent implements GetSessionOperation {
  getDynamoDbGetCommandInput({
    tableName,
    keyValue,
  }: {
    tableName: string;
    keyValue: string;
  }) {
    return {
      TableName: tableName,
      Key: { sessionId: marshall(keyValue) },
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void> {
    return getBiometricTokenIssuedSessionAttributes(item);
  }
}
