import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { DocumentType } from "../../../../types/document";
import { SessionState } from "../../session";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { getBaseSessionAttributes } from "../sessionAttributes/sessionAttributes";

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
  ) {
    return getBaseSessionAttributes(item);
  }
}
