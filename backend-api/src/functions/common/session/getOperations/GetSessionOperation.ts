import { AttributeValue, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";
import {
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionErrorInvalidAttributeTypeData,
} from "../SessionRegistry";

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
  ): Result<SessionAttributes, ValidateSessionErrorInvalidAttributeTypeData>;

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData>;
}
