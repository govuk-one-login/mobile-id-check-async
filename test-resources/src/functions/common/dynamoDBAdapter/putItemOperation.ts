export interface PutItemOperation {
  getDynamoDbPutItemCompositeKey(): ICompositeKey;
}

export interface ICompositeKeyData {
  sub: string;
  sentTimestamp: string;
}

export interface ICompositeKey {
  pk: string;
  sk: string;
}
