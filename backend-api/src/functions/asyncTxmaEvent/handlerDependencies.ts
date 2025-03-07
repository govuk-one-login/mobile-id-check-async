import { DynamoDbAdapter } from "../adapters/dynamoDbAdapter";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";

export type IAsyncTxmaEventDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getEventService: (sqsQueue: string) => IEventService;
};

export const runtimeDependencies: IAsyncTxmaEventDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
};
