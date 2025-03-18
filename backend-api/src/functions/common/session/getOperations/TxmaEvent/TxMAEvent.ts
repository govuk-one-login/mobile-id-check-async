import { AttributeValue, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import {
  BaseSessionAttributes,
  SessionAttributes,
  SessionState,
} from "../../session";
import { getBiometricTokenIssuedSessionAttributes } from "../../sessionAttributes/sessionAttributes";
import {
  GetSessionError
} from "../../SessionRegistry";
import { GetSessionOperation } from "../GetSessionOperation";

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
    attributes: Partial<BaseSessionAttributes>,
  ): Result<void, InvalidSessionData> {
    const { sessionState, createdAt } = attributes;

    if (sessionState && sessionState !== SessionState.BIOMETRIC_TOKEN_ISSUED) {
      return errorResult({
        errorType: GetSessionError.SESSION_INVALID,
        invalidAttribute: { sessionState },
      });
    }

    if (createdAt && isOlderThan60minutes(createdAt)) {
      return errorResult({
        errorType: GetSessionError.SESSION_INVALID,
        invalidAttribute: { createdAt },
      });
    }

    return emptySuccess();
  }
}

export interface InvalidSessionData {
  errorType: GetSessionError.SESSION_INVALID;
  invalidAttribute: Partial<InvalidSessionAttributes>;
}

export interface InvalidSessionAttributes {
  sessionState: Exclude<SessionState, SessionState.BIOMETRIC_TOKEN_ISSUED>;
  createdAt: number;
}

function isOlderThan60minutes(createdAtInMilliseconds: number) {
  const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
  const validFrom = Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;
  return createdAtInMilliseconds < validFrom;
}
