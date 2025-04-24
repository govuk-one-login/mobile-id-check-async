import { DynamoDbAdapter } from "../adapters/aws/dynamo/dynamoDbAdapter";
import { sendMessageToSqs } from "../adapters/aws/sqs/sendMessageToSqs";
import { OutboundQueueErrorMessage } from "../adapters/aws/sqs/types";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";
import { Result } from "../utils/result";

export type IAsyncAbortSessionDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getEventService: (sqsQueue: string) => IEventService;
  sendMessageToSqs: (
    sqsArn: string,
    messageBody: OutboundQueueErrorMessage,
  ) => Promise<Result<void, void>>;
};

export const runtimeDependencies: IAsyncAbortSessionDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
  sendMessageToSqs,
};
