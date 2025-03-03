import { emptyFailure, emptySuccess, Result } from "../utils/result";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { LogMessage } from "../common/logging/LogMessage";
import { logger } from "../common/logging/logger";

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

export const sqsClient = new SQSClient({
  region: process.env.REGION,
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});

type IdCheckSqsMessages = VendorProccessingMessage;

interface VendorProccessingMessage {
  biometricSessionId: string;
  sessionId: string;
}
