import {
  IDynamoDbTableKey,
  PutItemOperation,
} from "../../../common/dynamoDBAdapter/putItemOperation";
import { getTimeToLiveInSeconds } from "../../../common/utils/utils";

export class PutItemCredentialResult implements PutItemOperation {
  private readonly compositeKeyData: ICredentialResultCompositeKeyData;
  private readonly event: string;
  private readonly ttlDurationInSeconds: string;

  constructor({
    compositeKeyData,
    event,
    ttlDurationInSeconds,
  }: IPutItemCredentialResultData) {
    this.compositeKeyData = compositeKeyData;
    this.event = event;
    this.ttlDurationInSeconds = ttlDurationInSeconds;
  }

  getDynamoDbPutItemCommandInput(): IPutItemCommandInputData {
    const { sub, sentTimestamp } = this.compositeKeyData;

    return {
      pk: `SUB#${sub}`,
      sk: `SENT_TIMESTAMP#${sentTimestamp}`,
      event: JSON.stringify(this.event),
      timeToLiveInSeconds: getTimeToLiveInSeconds(this.ttlDurationInSeconds),
    };
  }
}

export interface IPutItemCredentialResultData {
  compositeKeyData: ICredentialResultCompositeKeyData;
  event: string;
  ttlDurationInSeconds: string;
}

export interface ICredentialResultCompositeKeyData {
  sub: string;
  sentTimestamp: string;
}

export interface IPutItemCommandInputData extends IDynamoDbTableKey {
  event: string;
  timeToLiveInSeconds: number;
}
