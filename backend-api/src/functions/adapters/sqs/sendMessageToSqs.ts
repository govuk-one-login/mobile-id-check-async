import { emptyFailure, emptySuccess, Result } from "../../utils/result";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { LogMessage } from "../../common/logging/LogMessage";
import { logger } from "../../common/logging/logger";
import { sqsClient } from "./sqsClient";
import { AsyncSqsMessages } from "./types";

export const sendMessageToSqs = async (
  sqsQueue: string,
  message: AsyncSqsMessages,
): Promise<Result<void, void>> => {
  try {
    logger.debug(LogMessage.SEND_MESSAGE_TO_SQS_ATTEMPT, {
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
    logger.error(LogMessage.SEND_MESSAGE_TO_SQS_FAILURE, {
      error,
    });
    return emptyFailure();
  }

  logger.debug(LogMessage.SEND_MESSAGE_TO_SQS_SUCCESS);
  return emptySuccess();
};
