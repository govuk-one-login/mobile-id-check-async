import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { DocumentType } from "../../../../types/document";
import { SessionState } from "../../session";
import {
  AttributeValue,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure,
} from "@aws-sdk/client-dynamodb";
import { BaseSessionAttributes } from "../../session";
import { NativeAttributeValue, unmarshall } from "@aws-sdk/util-dynamodb";
import { emptyFailure, Result, successResult } from "../../../../utils/result";

export class BiometricTokenIssued implements UpdateSessionOperation {
  constructor(
    private readonly documentType: DocumentType,
    private readonly opaqueId: string,
  ) {}

  getDynamoDbUpdateExpression() {
    return "set documentType = :documentType, opaqueId = :opaqueId, sessionState = :biometricTokenIssued";
  }

  getDynamoDbConditionExpression(): string {
    return `attribute_exists(sessionId) AND sessionState in (:authSessionCreated)`;
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ":documentType": { S: this.documentType },
      ":opaqueId": { S: this.opaqueId },
      ":biometricTokenIssued": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
      ":authSessionCreated": { S: SessionState.AUTH_SESSION_CREATED },
    };
  }

  getDynamoDbReturnValues() {
    return ReturnValue.ALL_NEW;
  }

  getDynamoDbReturnValuesOnConditionCheckFailure() {
    return ReturnValuesOnConditionCheckFailure.ALL_OLD;
  }

  getSessionAttributes(item: Record<string, AttributeValue> | undefined) {
    return getBaseSessionAttributes(item);
  }
}

const getBaseSessionAttributes = (
  item: Record<string, AttributeValue> | undefined,
): Result<BaseSessionAttributes, void> => {
  if (item == null) return emptyFailure();

  const sessionAttributes = unmarshall(item);
  if (!isBaseSessionAttributes(sessionAttributes)) return emptyFailure();

  return successResult(sessionAttributes);
};

const isBaseSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is BaseSessionAttributes => {
  if (typeof item.clientId !== "string") return false;
  if (typeof item.govukSigninJourneyId !== "string") return false;
  if (typeof item.createdAt !== "number") return false;
  if (typeof item.issuer !== "string") return false;
  if (typeof item.sessionId !== "string") return false;
  if (typeof item.sessionState !== "string") return false;
  if (typeof item.clientState !== "string") return false;
  if (typeof item.subjectIdentifier !== "string") return false;
  if (typeof item.timeToLive !== "number") return false;
  if (
    "redirectUri" in item &&
    item.redirectUri != null &&
    typeof item.redirectUri !== "string"
  ) {
    return false;
  }
  return true;
};
