import { AttributeValue, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import {
  isOlderThan60minutes,
  SessionAttributes,
  SessionState,
} from "../../session";
import { getTxmaEventBiometricTokenIssuedSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import {
  ValidateSessionAttributes,
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionErrorInvalidAttributeTypeData,
  ValidateSessionInvalidAttributes,
} from "../../SessionRegistry";
import { GetSessionOperation } from "../GetSessionOperation";

export class TxMAEventGetSessionOperation implements GetSessionOperation {
  getDynamoDbGetCommandInput({
    tableName,
    keyValue,
  }: {
    tableName: string;
    keyValue: string;
  }): GetItemCommandInput {
    return {
      TableName: tableName,
      Key: { sessionId: marshall(keyValue) },
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
  ): Result<SessionAttributes, ValidateSessionErrorInvalidAttributeTypeData> {
    return getTxmaEventBiometricTokenIssuedSessionAttributes(item);
  }

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, ValidateSessionErrorInvalidAttributesData> {
    const { sessionState, createdAt } = attributes;
    // const invalidAttributes: ValidateSessionInvalidAttributes[] = []
    const invalidAttributes: ValidateSessionInvalidAttributes = {};

    if (!sessionState || sessionState !== SessionState.BIOMETRIC_TOKEN_ISSUED) {
      // invalidAttributes.push({ sessionState })
      invalidAttributes.sessionState = sessionState;
    }

    if (!createdAt || isOlderThan60minutes(createdAt)) {
      // invalidAttributes.push({ createdAt })
      invalidAttributes.createdAt = createdAt;
    }

    // if (invalidAttributes) return errorResult({ invalidAttributes })
    if (Object.entries(invalidAttributes).length > 0)
      return errorResult({ invalidAttributes });

    return emptySuccess();
  }
}
