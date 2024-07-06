import { Context } from "aws-lambda";
import { ILoggerAdapter, RegisteredLogMessages } from "./types";

export class Logger<T extends string> {
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
}
