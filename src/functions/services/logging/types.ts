import { Context } from "aws-lambda";

export type LogMessageData = { message: string; messageCode: string };
export type RegisteredLogMessages<T extends string> = {
  [key in T]: RegisteredMessageData<T>;
};

export type LogMessage<T extends string> = {
  messageName: T;
} & RegisteredMessageData<T>;

export interface ILoggerAdapter<T extends string> {
  info: (message: LogMessage<T>) => void;
  addContext: (lambdaContext: Context) => void;
  appendKeys: (keys: { authSessionId: string }) => void;
}

type RegisteredMessageData<T extends string> = {
  message: string;
  messageCode: `MOBILE_ASYNC_${T}`;
};

export type MessageName = "MOCK_MESSAGE_NAME";

export interface ILogger<T extends string> {
  log(messageName: T): void;
  addContext(lambdaContext: Context): void;
  appendKeys: (keys: { authSessionId: string }) => void;
}
