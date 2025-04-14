import { IPutItemCommandInputData } from "../../dequeueCredentialResult/credentialResultRegistry/putItemOperation/putItemCredentialResult";

export interface PutItemOperation {
  getDynamoDbPutItemCommandInput(): IPutItemCommandInputData;
}

export interface IDynamoDbTableKey {
  pk: string;
  sk?: string;
}
