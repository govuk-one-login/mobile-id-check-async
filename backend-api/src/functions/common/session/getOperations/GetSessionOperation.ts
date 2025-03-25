import { AttributeValue, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { BiometricTokenIssuedSessionAttributes } from "../session";
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
  ): Result<
    BiometricTokenIssuedSessionAttributes,
    ValidateSessionErrorInvalidAttributeTypeData
  >;

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData>;
}
