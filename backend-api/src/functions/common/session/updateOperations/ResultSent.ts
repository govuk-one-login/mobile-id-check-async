import {IUpdateSessionOperation, SessionState} from "../Session";

export class ResultSent implements IUpdateSessionOperation {

  getDynamoDbUpdateExpression() {
    return 'set sessionState = :resultSent'
  }

  getDynamoDbConditionExpression(): undefined {
    return undefined
  }

  getDynamoDbExpressionAttributeValues() {
    return {
      ':resultSent': {S: SessionState.RESULT_SENT},
    } as const
  }
}
