import {IUpdateSessionOperation, SessionState} from "../Session";

export class BiometricTokenIssued implements IUpdateSessionOperation {
  constructor(
    private readonly documentType: string,
    private readonly accessToken: string,
    private readonly opaqueId: string,
  ) {}

  getDynamoDbUpdateExpression() {
    return 'set documentType = :documentType, accessToken = :accessToken, opaqueId = :opaqueId, sessionState = :biometricTokenIssued'
  }

  getDynamoDbConditionExpression(): string {
    return `sessionState in (:authSessionCreated)`
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ':documentType': {S: this.documentType},
      ':accessToken': {S: this.accessToken},
      ':opaqueId': {S: this.opaqueId},
      ':biometricTokenIssued': {S: SessionState.BIOMETRIC_TOKEN_ISSUED},
      ':authSessionCreated': {S: SessionState.AUTH_SESSION_CREATED}
    } as const
  }


}
