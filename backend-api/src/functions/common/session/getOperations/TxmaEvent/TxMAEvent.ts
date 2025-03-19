import { AttributeValue, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import {
  getBiometricTokenIssuedSessionAttributes,
  isOlderThan60minutes,
} from "../../sessionAttributes/sessionAttributes";
import { GetSessionOperation } from "../GetSessionOperation";
import {
  SessionRetrievalValidateSessionInvalidAttribute,
  ValidateSessionAttributes,
} from "../../SessionRegistry";

export class TxMAEvent implements GetSessionOperation {
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
    item: Record<string, AttributeValue> | undefined,
  ): Result<SessionAttributes, void> {
    return getBiometricTokenIssuedSessionAttributes(item);
  }

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, SessionRetrievalValidateSessionInvalidAttribute> {
    const { sessionState, createdAt } = attributes;

    if (!sessionState || sessionState !== SessionState.BIOMETRIC_TOKEN_ISSUED) {
      return errorResult({
        invalidAttribute: { sessionState },
      });
    }

    if (!createdAt || isOlderThan60minutes(createdAt)) {
      return errorResult({
        invalidAttribute: { createdAt },
      });
    }

    return emptySuccess();
  }
}

// function isOlderThan60minutes(createdAtInMilliseconds: number) {
//   const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
//   const validFrom = Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;
//   return createdAtInMilliseconds < validFrom;
// }
