export interface PutItemOperation {
  getDynamoDbPutItemCompositeKey(): ICompositeKey;
  getDynamoDbPutItemEventPayload(): string;
  getDynamoDbPutItemTimeToLive(): number;
}

export interface ICompositeKeyData {
  sub: string;
  sentTimestamp: string;
}

export interface ICompositeKey {
  pk: string;
  sk: string;
}

export interface IPutItemOperationData {
  compositeKeyData: ICompositeKeyData;
  event: string;
  timeToLiveInSeconds: number;
}
