import { AttributeValue, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { BaseSessionAttributes, SessionAttributes } from "../session";
import { InvalidSessionData } from "./TxmaEvent/TxMAEvent";

export interface GetSessionOperation {
  getDynamoDbGetCommandInput({
    tableName,
    keyValue,
  }: {
    tableName: string;
    keyValue: string;
  }): GetItemCommandInput;

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void>;

  validateSession(
    attributes: Partial<BaseSessionAttributes>,
  ): Result<void, InvalidSessionData>;
}
