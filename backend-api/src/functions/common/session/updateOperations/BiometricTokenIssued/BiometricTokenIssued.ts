import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { DocumentType } from "../../../../types/document";
import { SessionState } from "../../session";
import {
  getBaseSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { oneHourAgoInMilliseconds } from "../../../../utils/utils";

export class BiometricTokenIssued implements UpdateSessionOperation {
  constructor(
    private readonly documentType: DocumentType,
    private readonly opaqueId: string,
  ) {}

  getDynamoDbUpdateExpression() {
    return "set documentType = :documentType, opaqueId = :opaqueId, sessionState = :biometricTokenIssued";
  }

  getDynamoDbConditionExpression(): string {
    return `attribute_exists(sessionId) AND sessionState = :authSessionCreated AND createdAt > :oneHourAgoInMilliseconds`;
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ":documentType": { S: this.documentType },
      ":opaqueId": { S: this.opaqueId },
      ":biometricTokenIssued": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
      ":authSessionCreated": { S: SessionState.AUTH_SESSION_CREATED },
      ":oneHourAgoInMilliseconds": { N: oneHourAgoInMilliseconds().toString() }, // Store as number
    };
  }

  getSessionAttributesFromDynamoDbItem(
    item: Record<string, AttributeValue>,
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
}
