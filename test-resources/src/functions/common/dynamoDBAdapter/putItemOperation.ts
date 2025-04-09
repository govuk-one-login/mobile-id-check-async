import { TxmaEvent } from "../../dequeue/getEvent";
import { ICredentialResult } from "../../dequeueCredentialResult/credentialResult";
import { EmptyFailure } from "../utils/result";

export interface PutItemOperation {
  getDynamoDbPutItemCompositeKey(item: TestResourceItem): CompositeKey;
  handlePutItemError(error: unknown): EmptyFailure;
}

export type TestResourceItem = TxmaEvent & ICredentialResult;

export interface CompositeKey {
  pk: string;
  sk: string;
}
