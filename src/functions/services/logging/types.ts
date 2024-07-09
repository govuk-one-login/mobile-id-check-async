export type LogMessageData = { message: string; messageCode: string };
export type RegisteredLogMessages<T extends string> = {
  [key in T]: RegisteredMessageData<T>;
};

export type LogMessage<T extends string> = {
  message: T;
} & RegisteredMessageData<T>;

type RegisteredMessageData<T extends string> = {
  messageCode: `MOBILE_ASYNC_${T}`;
};

export type Message = "MOCK_MESSAGE_NAME";
