import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { DocumentType } from "../../../../types/document";
import { emptySuccess, errorResult, Result } from "../../../../utils/result";
import { SessionState } from "../../session";
import {
  getBaseSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import {
  UpdateSessionValidateSessionErrorData,
  ValidateSessionAttributes,
} from "../../SessionRegistry";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { isOlderThan60Minutes } from "../../../../utils/utils";

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

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue> | undefined,
    options?: {
      operationFailed: boolean;
    },
  ) {
    if (options?.operationFailed) {
      return getBaseSessionAttributes(item);
    } else {
      return getBiometricTokenIssuedSessionAttributes(item);
    }
  }

  validateSession(
    attributes: ValidateSessionAttributes,
  ): Result<void, UpdateSessionValidateSessionErrorData> {
    const { sessionState, createdAt } = attributes;

    if (!sessionState || sessionState !== SessionState.BIOMETRIC_TOKEN_ISSUED) {
      return errorResult({
        invalidAttribute: { sessionState },
      });
    }

    if (!createdAt || isOlderThan60Minutes(createdAt)) {
      return errorResult({
        invalidAttribute: { createdAt },
      });
    }

    return emptySuccess();
  }
}
