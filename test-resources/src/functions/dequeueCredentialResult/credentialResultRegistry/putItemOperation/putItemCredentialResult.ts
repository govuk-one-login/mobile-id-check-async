import {
  ICompositeKey,
  ICompositeKeyData,
  IPutItemOperationData,
  PutItemOperation,
} from "../../../common/dynamoDbAdapter/putItemOperation";

export class PutItemCredentialResult implements PutItemOperation {
  private readonly compositeKeyData: ICompositeKeyData;
  private readonly event: string;
  private readonly timeToLiveInSeconds: number;

  constructor({
    compositeKeyData,
    event,
    timeToLiveInSeconds,
  }: IPutItemOperationData) {
    this.compositeKeyData = compositeKeyData;
    this.event = event;
    this.timeToLiveInSeconds = timeToLiveInSeconds;
  }

  getDynamoDbPutItemCompositeKey(): ICompositeKey {
    const { sub, sentTimestamp } = this.compositeKeyData;

    return {
      pk: `SUB#${sub}`,
      sk: `SENT_TIMESTAMP#${sentTimestamp}`,
    };
  }

  getDynamoDbPutItemEventPayload(): string {
    return JSON.stringify(this.event);
  }

  getDynamoDbPutItemTimeToLive(): number {
    return this.timeToLiveInSeconds;
  }
}
