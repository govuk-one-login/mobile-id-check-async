import { PutItemOperation } from "../../../common/dynamoDBAdapter/putItemOperation";
import { logger } from "../../../common/logging/logger";
import { LogMessage } from "../../../common/logging/LogMessage";
import { emptyFailure } from "../../../common/utils/result";
import { ICredentialResult } from "../../credentialResult";

export class PutItemCredentialResult implements PutItemOperation {
  getDynamoDbPutItemCompositeKey(item: ICredentialResult) {
    const { sub, sentTimestamp } = item;

    return {
      pk: `SUB#${sub}`,
      sk: `SENT_TIMESTAMP#${sentTimestamp}`,
    };
  }

  handlePutItemError(error: unknown) {
    logger.error(
      LogMessage.DEQUEUE_CREDENTIAL_RESULT_WRITE_TO_DATABASE_FAILURE,
      {
        error,
      },
    );
    return emptyFailure();
  }
}
