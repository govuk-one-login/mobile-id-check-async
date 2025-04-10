import { EmptyFailure } from "../utils/result";

export interface PutItemOperation {
  getDynamoDbPutItemCompositeKey(): ICompositeKey;
  handlePutItemError(error: unknown): EmptyFailure;
}

export interface ICompositeKeyData {
  sub: string;
  sentTimestamp: string;
}

export interface ICompositeKey {
  pk: string;
  sk: string;
}
