import { SessionRegistry } from "../common/session/SessionRegistry";
import { DynamoDbAdapter } from "../adapters/dynamoDbAdapter";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";
import { sendMessageToSqs } from "../adapters/sqs/sendMessageToSqs";
import { SqsMessageBodies } from "../adapters/sqs/types";
import { Result } from "../utils/result";

export type IAsyncFinishBiometricSessionDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getEventService: (sqsQueue: string) => IEventService;
  getSendMessageToSqs: () => (
    sqsArn: string,
    messageBody: SqsMessageBodies,
  ) => Promise<Result<void, void>>;
};

export const runtimeDependencies: IAsyncFinishBiometricSessionDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
  getSendMessageToSqs: () => (sqsArn: string, messageBody: SqsMessageBodies) =>
    sendMessageToSqs(sqsArn, messageBody),
};
