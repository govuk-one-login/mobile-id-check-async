import { EmptyFailure } from "../utils/result";

export interface PutItemOperation {
  getDynamoDbPutItemCompositeKey(item: TestResourceItem): ICompositeKey;
  handlePutItemError(error: unknown): EmptyFailure;
}

export type TestResourceItem = ICompositeKeyData;

export interface ICompositeKeyData {
  sub: string;
  sentTimestamp: string;
}

export interface ICompositeKey {
  pk: string;
  sk: string;
}
