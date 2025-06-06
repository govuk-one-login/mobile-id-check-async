import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import { isOlderThan60Minutes } from "../../../../utils/utils";
import {
  BiometricTokenIssuedSessionAttributes,
  SessionState,
} from "../../session";
import { getTxmaEventBiometricTokenIssuedSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import {
  GetSessionAttributesInvalidAttributesError,
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionInvalidAttributes,
} from "../../SessionRegistry/types";
import { GetSessionOperation } from "../GetSessionOperation";

export class GetSessionBiometricTokenIssued implements GetSessionOperation {
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<
    BiometricTokenIssuedSessionAttributes,
    GetSessionAttributesInvalidAttributesError
  > {
    return getTxmaEventBiometricTokenIssuedSessionAttributes(item);
  }

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData> {
    const { sessionState, createdAt } = attributes;
    const invalidAttributes: ValidateSessionInvalidAttributes[] = [];

    if (!sessionState || sessionState !== SessionState.BIOMETRIC_TOKEN_ISSUED) {
      invalidAttributes.push({ sessionState });
    }

    if (!createdAt || isOlderThan60Minutes(createdAt)) {
      invalidAttributes.push({ createdAt });
    }

    if (invalidAttributes.length > 0) return errorResult({ invalidAttributes });

    return emptySuccess();
  }
}
