import { GetSessionOperation } from "../GetSessionOperation";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import {
  BiometricSessionFinishedAttributes,
  SessionState,
} from "../../session";
import {
  GetSessionAttributesInvalidAttributesError,
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionInvalidAttributes,
} from "../../SessionRegistry/types";
import { getBiometricSessionFinishedSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import { isOlderThan60Minutes } from "../../../../utils/utils";

export class GetSessionIssueBiometricCredential implements GetSessionOperation {
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<
    BiometricSessionFinishedAttributes,
    GetSessionAttributesInvalidAttributesError
  > {
    return getBiometricSessionFinishedSessionAttributes(item);
  }

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData> {
    const { sessionState, createdAt } = attributes;
    const validStates = [
      SessionState.BIOMETRIC_SESSION_FINISHED,
      SessionState.RESULT_SENT,
    ];
    const invalidAttributes: ValidateSessionInvalidAttributes[] = [];

    if (!sessionState || !validStates.includes(sessionState)) {
      invalidAttributes.push({ sessionState });
    }

    if (!createdAt || isOlderThan60Minutes(createdAt)) {
      invalidAttributes.push({ createdAt });
    }

    if (invalidAttributes.length > 0) return errorResult({ invalidAttributes });

    return emptySuccess();
  }
}
