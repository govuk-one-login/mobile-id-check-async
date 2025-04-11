import {
  ICompositeKey,
  ICompositeKeyData,
  IPutItemOperationData,
  PutItemOperation,
} from "../../../common/dynamoDBAdapter/putItemOperation";
import { getTimeToLiveInSeconds } from "../../../common/utils/utils";

export class PutItemCredentialResult implements PutItemOperation {
  private readonly compositeKeyData: ICompositeKeyData;
  private readonly event: string;
  private readonly ttlDurationInSeconds: string;

  constructor({
    compositeKeyData,
    event,
    ttlDurationInSeconds,
  }: IPutItemOperationData) {
    this.compositeKeyData = compositeKeyData;
    this.event = event;
    this.ttlDurationInSeconds = ttlDurationInSeconds;
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
    return getTimeToLiveInSeconds(this.ttlDurationInSeconds);
  }
}
