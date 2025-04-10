import {
  ICompositeKeyData,
  PutItemOperation,
} from "../../../common/dynamoDBAdapter/putItemOperation";

export class PutItemCredentialResult implements PutItemOperation {
  constructor(private readonly compositeKeyData: ICompositeKeyData) {}

  getDynamoDbPutItemCompositeKey() {
    const { sub, sentTimestamp } = this.compositeKeyData;

    return {
      pk: `SUB#${sub}`,
      sk: `SENT_TIMESTAMP#${sentTimestamp}`,
    };
  }
}
