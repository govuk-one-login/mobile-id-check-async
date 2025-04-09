import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { BiometricTokenIssuedSessionAttributes } from "../session";
import {
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  GetSessionAttributesInvalidAttributesError,
} from "../SessionRegistry";

export interface GetSessionOperation {
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
  ): Result<
    BiometricTokenIssuedSessionAttributes,
    GetSessionAttributesInvalidAttributesError
  >;

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData>;
}
