import { Logger } from "../services/logging/logger";
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import { MessageName, registeredLogs } from "./registeredLogs";
import { ITokenService, TokenService } from "./tokenService/tokenService";
import { IDataStore } from "../adapters/session/datastore";
import { DynamoDbAdapter } from "../adapters/session/dynamoDbAdapter";

export interface IAsyncActiveSessionDependencies {
  env: NodeJS.ProcessEnv;
  logger: () => Logger<MessageName>;
  tokenService: () => ITokenService;
  datastore: (tableName: string) => IDataStore;
}

export const dependencies: IAsyncActiveSessionDependencies = {
  env: process.env,
  logger: () => new Logger<MessageName>(new PowertoolsLogger(), registeredLogs),
  tokenService: () => new TokenService(),
  datastore: (tableName: string) => new DynamoDbAdapter(tableName),
};
