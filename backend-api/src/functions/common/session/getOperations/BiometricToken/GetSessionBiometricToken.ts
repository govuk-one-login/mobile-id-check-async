import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import { isOlderThan60Minutes } from "../../../../utils/utils";
import { BiometricTokenSessionAttributes, SessionState } from "../../session";
import { getBiometricTokenSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import {
  GetSessionAttributesInvalidAttributesError,
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionInvalidAttributes,
} from "../../SessionRegistry/types";
import { GetSessionOperation } from "../GetSessionOperation";

export class GetSessionBiometricToken implements GetSessionOperation {
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<
    BiometricTokenSessionAttributes,
    GetSessionAttributesInvalidAttributesError
  > {
    return getBiometricTokenSessionAttributes(item);
  }

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData> {
    const { sessionState, createdAt } = attributes;
    const invalidAttributes: ValidateSessionInvalidAttributes[] = [];

    if (!sessionState || sessionState !== SessionState.AUTH_SESSION_CREATED) {
      invalidAttributes.push({ sessionState });
    }

    if (!createdAt || isOlderThan60Minutes(createdAt)) {
      invalidAttributes.push({ createdAt });
    }

    if (invalidAttributes.length > 0) return errorResult({ invalidAttributes });

    return emptySuccess();
  }
}
