import { IUpdateSessionOperation, SessionState } from "../Session";

export class BiometricSessionFinished implements IUpdateSessionOperation {
  constructor(private readonly biometricSessionId: string) {}

  getDynamoDbUpdateExpression() {
    return "set biometricSessionId = :biometricSessionId, sessionState = :biometricSessionFinished";
  }

  getDynamoDbConditionExpression(): string {
    return `sessionState in (:biometricTokenIssued)`;
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ":biometricSessionId": { S: this.biometricSessionId },
      ":biometricSessionFinished": {
        S: SessionState.BIOMETRIC_SESSION_FINISHED,
      },
      ":biometricTokenIssued": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
    } as const;
  }
}
