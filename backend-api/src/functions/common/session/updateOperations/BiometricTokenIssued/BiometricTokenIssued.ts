import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { DocumentType } from "../../../../types/document";
import { SessionState } from "../../session";
import {
  getBaseSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "../../sessionAttributes/sessionAttributes";
import { UpdateSessionOperation } from "../UpdateSessionOperation";
import { oneHourAgoInMilliseconds } from "../../../../utils/utils";

export class BiometricTokenIssued extends UpdateSessionOperation {
  constructor(
    private readonly documentType: DocumentType,
    private readonly opaqueId: string,
  ) {
    super();
  }

  static readonly nextSessionState = SessionState.BIOMETRIC_TOKEN_ISSUED;
  static readonly validPriorSessionStates = [SessionState.AUTH_SESSION_CREATED];

  getDynamoDbUpdateExpression() {
    return `set documentType = :documentType, opaqueId = :opaqueId, sessionState = :${BiometricTokenIssued.nextSessionState}`;
  }

  getDynamoDbConditionExpression(): string {
    return `attribute_exists(sessionId) AND ${this.validPriorSessionStatesCondition()} AND createdAt > :oneHourAgoInMilliseconds`;
  }

  getDynamoDbExpressionAttributeValues() {
    const values = this.sessionStateAttributeValues(
      BiometricTokenIssued.nextSessionState,
      BiometricTokenIssued.validPriorSessionStates,
    );
    return {
      ...values,
      ":documentType": { S: this.documentType },
      ":opaqueId": { S: this.opaqueId },
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

  getValidPriorSessionStates(): Array<string> {
    return BiometricTokenIssued.validPriorSessionStates;
  }
}
