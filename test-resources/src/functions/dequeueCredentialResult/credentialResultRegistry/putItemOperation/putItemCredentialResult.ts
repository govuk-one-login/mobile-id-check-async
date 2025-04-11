import {
  ICompositeKeyData,
  IPutItemOperationData,
  PutItemOperation,
} from "../../../common/dynamoDBAdapter/putItemOperation";

export class PutItemCredentialResult implements PutItemOperation {
  private readonly compositeKeyData: ICompositeKeyData;
  private readonly event: string;

  constructor({ compositeKeyData, event }: IPutItemOperationData) {
    this.compositeKeyData = compositeKeyData;
    this.event = event;
  }

  getDynamoDbPutItemCompositeKey() {
    const { sub, sentTimestamp } = this.compositeKeyData;

    return {
      pk: `SUB#${sub}`,
      sk: `SENT_TIMESTAMP#${sentTimestamp}`,
    };
  }

  getDynamoDbPutItemEventPayload(): string {
    return JSON.stringify(this.event);
  }
}
