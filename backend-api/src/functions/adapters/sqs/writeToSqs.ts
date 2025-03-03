import { emptyFailure, emptySuccess, Result } from "../../utils/result";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

import { LogMessage } from "../../common/logging/LogMessage";
import { logger } from "../../common/logging/logger";
import { sqsClient } from "./sqsClient";
import { IdCheckSqsMessages } from "./types";

export const writeToSqs = async (
  sqsQueue: string,
  message: IdCheckSqsMessages,
): Promise<Result<void, void>> => {
  try {
    logger.debug(LogMessage.WRITE_TO_SQS_ATTEMPT, {
      data: {
        sqsQueue,
        message,
      },
    });
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: sqsQueue,
        MessageBody: JSON.stringify(message),
      }),
    );
  } catch (error: unknown) {
    logger.error(LogMessage.WRITE_TO_SQS_FAILURE, {
      error,
    });
    return emptyFailure();
  }

  logger.debug(LogMessage.WRITE_TO_SQS_SUCCESS);
  return emptySuccess();
};
