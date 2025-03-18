import { emptyFailure, emptySuccess, Result } from "../../../utils/result";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { LogMessage } from "../../../common/logging/LogMessage";
import { logger } from "../../../common/logging/logger";
import { VendorProcessingMessage } from "./types";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export const sendMessageToSqs = async (
  sqsArn: string,
  messageBody: VendorProcessingMessage,
): Promise<Result<void, void>> => {
  try {
    logger.debug(LogMessage.SEND_MESSAGE_TO_SQS_ATTEMPT, {
      data: {
        sqsArn,
      },
    });
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: sqsArn,
        MessageBody: JSON.stringify(messageBody),
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

export const sqsClient = new SQSClient({
  region: process.env.REGION,
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});
