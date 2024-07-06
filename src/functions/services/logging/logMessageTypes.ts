export type LogMessageData = { message: string; messageCode: string };
export type RegisteredLogMessages<T extends string> = {
  [key in T]: RegisteredMessageData<T>;
};

export type LogMessage<T extends string> = {
  messageName: T;
} & RegisteredMessageData<T>;

type RegisteredMessageData<T extends string> = {
  message: string;
  messageCode: `MOBILE_ASYNC_${T}`;
};

export type MessageName = "MOCK_MESSAGE_NAME";
