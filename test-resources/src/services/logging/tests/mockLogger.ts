import { LogAttributes } from "@aws-lambda-powertools/logger/lib/cjs/types/Logger";
import { Context } from "vm";
import { ILoggerAdapter } from "../logger";
import { LogMessage } from "../types";

export class MockLoggingAdapter<T extends string> implements ILoggerAdapter<T> {
  private readonly logMessages: {
    logMessage: LogMessage<T>;
    data: LogAttributes;
  }[] = [];
  private contextBody: Context | undefined;
  info = (logMessage: LogMessage<T>, data: LogAttributes): void => {
    const enrichedLogMessage = {
      ...this.contextBody,
      ...logMessage,
    };
    this.logMessages.push({ logMessage: enrichedLogMessage, data });
  };
  getLogMessages = (): { logMessage: LogMessage<T>; data: LogAttributes }[] => {
    return this.logMessages;
  };

  addContext = (lambdaContext: Context) => {
    this.contextBody = lambdaContext;
  };
}
