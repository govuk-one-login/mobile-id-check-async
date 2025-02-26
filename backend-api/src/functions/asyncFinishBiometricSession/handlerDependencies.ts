import { SessionRegistry } from "../common/session/SessionRegistry";
import { DynamoDbAdapter } from "../adapters/dynamoDbAdapter";
import { EventService } from "../services/events/eventService";
import { IEventService } from "../services/events/types";

export type IAsyncFinishBiometricSessionDependencies = {
  env: NodeJS.ProcessEnv;
  getSessionRegistry: (tableName: string) => SessionRegistry;
  getEventService: (sqsQueue: string) => IEventService;
};

export const runtimeDependencies: IAsyncFinishBiometricSessionDependencies = {
  env: process.env,
  getSessionRegistry: (tableName: string) => new DynamoDbAdapter(tableName),
  getEventService: (sqsQueue: string) => new EventService(sqsQueue),
};
