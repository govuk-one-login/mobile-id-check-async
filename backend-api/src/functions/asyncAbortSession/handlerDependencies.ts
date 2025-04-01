import { DynamoDbAdapter } from "../adapters/aws/dynamo/dynamoDbAdapter";
import { sendMessageToSqs } from "../adapters/aws/sqs/sendMessageToSqs";
import { AbortSessionMessage } from "../adapters/aws/sqs/types";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";
import { Result } from "../utils/result";

export type IAsyncAbortSessionDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getEventService: (sqsQueue: string) => IEventService;
  getSendMessageToSqs: () => (
    sqsArn: string,
    messageBody: AbortSessionMessage,
  ) => Promise<Result<void, void>>;
};

export const runtimeDependencies: IAsyncAbortSessionDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
  getSendMessageToSqs:
    () => (sqsArn: string, messageBody: AbortSessionMessage) =>
      sendMessageToSqs(sqsArn, messageBody),
};
