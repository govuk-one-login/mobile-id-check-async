import { Context } from "aws-lambda";
import { LogMessage, RegisteredLogMessages } from "./types";
import { LogAttributes } from "@aws-lambda-powertools/logger/lib/cjs/types";

export interface ILogger<T extends string> {
  log(message: T, data: LogAttributes): void;
  addContext(lambdaContext: Context): void;
  setSessionId: (keys: { sessionId: string }) => void;
}

export interface ILoggerAdapter<T extends string> {
  info: (message: LogMessage<T>, data: LogAttributes) => void;
  addContext: (lambdaContext: Context) => void;
  appendKeys: (keys: { sessionId: string }) => void;
}

export class Logger<T extends string> implements ILogger<T> {
  constructor(
    private logger: ILoggerAdapter<T>,
    private registeredLogs: RegisteredLogMessages<T>,
  ) {}
  log = (message: T, data: LogAttributes = {}): void => {
    this.logger.info(
      {
        message,
        messageCode: this.registeredLogs[message].messageCode,
      },
      data,
    );
  };

  addContext = (context: Context): void => {
    this.logger.addContext(context);
  };

  setSessionId = (keys: { sessionId: string }) => {
    this.logger.appendKeys(keys);
  };
}
