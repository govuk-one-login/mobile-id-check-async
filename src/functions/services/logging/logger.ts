import { Context } from "aws-lambda";
import { ILogger, ILoggerAdapter, RegisteredLogMessages } from "./types";

export class Logger<T extends string> implements ILogger<T> {
  constructor(
    private logger: ILoggerAdapter<T>,
    private registeredLogs: RegisteredLogMessages<T>,
  ) {}
  log = (messageName: T): void => {
    this.logger.info({
      message: this.registeredLogs[messageName].message,
      messageCode: this.registeredLogs[messageName].messageCode,
      messageName,
    });
  };

  addContext = (context: Context): void => {
    this.logger.addContext(context);
  };

  appendKeys = (keys: { authSessionId: string }) => {
    this.logger.appendKeys(keys);
  };
}
