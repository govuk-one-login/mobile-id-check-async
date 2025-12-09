import { sendMessageToSqsWithDelay } from "../adapters/aws/sqs/sendMessageToSqs";
import { SQSMessageBody } from "../adapters/aws/sqs/types";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";
import { Result } from "../utils/result";

export type BackoffRetryDemoDependencies = {
  env: NodeJS.ProcessEnv;
  getEventService: (sqsQueue: string) => IEventService;
  sendMessageToSqsWithDelay: (
    sqsArn: string,
    messageBody: SQSMessageBody,
    delaySeconds: number | undefined,
  ) => Promise<Result<string | undefined, void>>;
};

export const runtimeDependencies: BackoffRetryDemoDependencies = {
  env: process.env,
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
  sendMessageToSqsWithDelay,
};
