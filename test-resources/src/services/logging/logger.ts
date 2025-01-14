import { Context } from "aws-lambda";
import { LogMessage, RegisteredLogMessages } from "./types";
import { LogAttributes } from "@aws-lambda-powertools/logger/lib/cjs/types/Logger";

export interface ILogger<T extends string> {
  log(message: T, data: LogAttributes): void;
  addContext(lambdaContext: Context): void;
}

export interface ILoggerAdapter<T extends string> {
  info: (message: LogMessage<T>, data: LogAttributes) => void;
  addContext: (lambdaContext: Context) => void;
}

export class Logger<T extends string> implements ILogger<T> {
  constructor(
    private readonly logger: ILoggerAdapter<T>,
    private readonly registeredLogs: RegisteredLogMessages<T>,
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
}
