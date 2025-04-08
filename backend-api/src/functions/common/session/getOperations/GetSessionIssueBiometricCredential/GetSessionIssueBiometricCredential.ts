import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import {
  BiometricSessionFinishedAttributes,
  SessionState,
} from "../../session";
import {
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionErrorInvalidAttributeTypeData,
  ValidateSessionInvalidAttributes,
} from "../../SessionRegistry";
import { GetSessionOperation } from "../GetSessionOperation";
import { myFuncTempName } from "../../sessionAttributes/sessionAttributes";
import { isOlderThan60Minutes } from "../../../../utils/utils";

export class GetSessionIssueBiometricCredential implements GetSessionOperation {
  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<
    BiometricSessionFinishedAttributes,
    ValidateSessionErrorInvalidAttributeTypeData
  > {
    return myFuncTempName(item);
  }

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData> {
    const { sessionState, createdAt } = attributes;
    const invalidAttributes: ValidateSessionInvalidAttributes[] = [];

    if (
      !sessionState ||
      sessionState !== SessionState.BIOMETRIC_SESSION_FINISHED
    ) {
      invalidAttributes.push({ sessionState });
    }

    if (!createdAt || isOlderThan60Minutes(createdAt)) {
      invalidAttributes.push({ createdAt });
    }

    if (invalidAttributes.length > 0) return errorResult({ invalidAttributes });

    return emptySuccess();
  }
}
