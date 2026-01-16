import {
  ChangeMessageVisibilityCommand,
  ChangeMessageVisibilityCommandOutput,
  ChangeMessageVisibilityRequest,
  SendMessageCommand,
  SendMessageResult,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { LogMessage } from "../../../common/logging/LogMessage";
import { logger } from "../../../common/logging/logger";
import { emptyFailure, emptySuccess, Result, successResult } from "../../../utils/result";
import { SQSMessageBody } from "./types";

export const sendMessageToSqs = async (
  sqsArn: string,
  messageBody: SQSMessageBody,
): Promise<Result<string | undefined, void>> => {
  return sendMessageToSqsWithDelay(sqsArn, messageBody, undefined);
};

export const sendMessageToSqsWithDelay = async (
  sqsArn: string,
  messageBody: SQSMessageBody,
  delaySeconds: number | undefined,
): Promise<Result<string | undefined, void>> => {
  let response: SendMessageResult;
  try {
    logger.debug(LogMessage.SEND_MESSAGE_TO_SQS_ATTEMPT, {
      data: {
        sqsArn,
      },
    });
    response = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: sqsArn,
        MessageBody: JSON.stringify(messageBody),
        DelaySeconds: delaySeconds,
      }),
    );
  } catch (error: unknown) {
    logger.error(LogMessage.SEND_MESSAGE_TO_SQS_FAILURE, {
      error,
    });
    return emptyFailure();
  }

  logger.debug(LogMessage.SEND_MESSAGE_TO_SQS_SUCCESS);
  return successResult(response.MessageId);
};

export const changeMessageVisibility = async (
  sqsArn: string,
  receiptHandle: string,
  visibilityTimeout: number,
): Promise<Result<void>> => {
  const input: ChangeMessageVisibilityRequest = {
    QueueUrl: sqsArn,
    ReceiptHandle: receiptHandle,
    VisibilityTimeout: visibilityTimeout,
  };

  const response: ChangeMessageVisibilityCommandOutput = await sqsClient.send(
    new ChangeMessageVisibilityCommand(input),
  );

  logger.debug(LogMessage. CHANGE_MESSAGE_VISIBILITY_ATTEMPT, {
    changeResponseMetadata: response.$metadata,
  });
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
