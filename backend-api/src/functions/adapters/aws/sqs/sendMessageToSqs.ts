import {
  SendMessageCommand,
  SendMessageResult,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { LogMessage } from "../../../common/logging/LogMessage";
import { logger } from "../../../common/logging/logger";
import { emptyFailure, Result, successResult } from "../../../utils/result";
import { SQSMessageBody } from "./types";

export interface SendMessageToSqsResponse {
  messageId: string;
}

export const sendMessageToSqs = async (
  sqsArn: string,
  messageBody: SQSMessageBody,
): Promise<Result<SendMessageToSqsResponse, void>> => {
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
      }),
    );
  } catch (error: unknown) {
    logger.error(LogMessage.SEND_MESSAGE_TO_SQS_FAILURE, {
      error,
    });
    return emptyFailure();
  }

  logger.debug(LogMessage.SEND_MESSAGE_TO_SQS_SUCCESS);
  return successResult({ messageId: response.MessageId ?? "undefined" });
};

export const sqsClient = new SQSClient({
  region: process.env.REGION,
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});
