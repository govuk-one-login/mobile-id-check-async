import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { BiometricTokenIssuedSessionAttributes } from "../session";
import {
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionErrorInvalidAttributeTypeData,
} from "../SessionRegistry";

export interface GetSessionOperation {
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
