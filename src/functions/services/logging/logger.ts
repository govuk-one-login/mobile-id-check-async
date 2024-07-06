import { Context } from "aws-lambda";
import { ILogger, ILoggerAdapter, RegisteredLogMessages } from "./types";
import { LogAttributes } from "@aws-lambda-powertools/logger/lib/cjs/types/Log";

export class Logger<T extends string> implements ILogger<T> {
  constructor(
    private logger: ILoggerAdapter<T>,
    private registeredLogs: RegisteredLogMessages<T>,
  ) {}
  log = (messageName: T, data: LogAttributes = {}): void => {
    this.logger.info(
      {
        message: this.registeredLogs[messageName].message,
        messageCode: this.registeredLogs[messageName].messageCode,
        messageName,
        data,
      },
      data,
    );
  };

  addContext = (context: Context): void => {
    this.logger.addContext(context);
  };

  appendKeys = (keys: { authSessionId: string }) => {
    this.logger.appendKeys(keys);
  };
}
