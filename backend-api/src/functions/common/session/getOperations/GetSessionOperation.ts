import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { Result } from "../../../utils/result";
import { SessionAttributes } from "../session";
import {
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  GetSessionAttributesInvalidAttributesError,
} from "../SessionRegistry";

export interface GetSessionOperation {
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<SessionAttributes, GetSessionAttributesInvalidAttributesError>;

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData>;
}
