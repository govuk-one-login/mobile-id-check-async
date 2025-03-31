import { DynamoDbAdapter } from "../adapters/aws/dynamo/dynamoDbAdapter";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";

export type IAsyncAbortSessionDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getEventService: (sqsQueue: string) => IEventService;
};

export const runtimeDependencies: IAsyncAbortSessionDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
};
