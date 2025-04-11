export interface PutItemOperation {
  getDynamoDbPutItemCommandInput(): IPutItemCommandInput;
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
  ttlDurationInSeconds: string;
}

export interface IPutItemCommandInput extends ICompositeKey {
  event: string;
  timeToLiveInSeconds: number;
}
