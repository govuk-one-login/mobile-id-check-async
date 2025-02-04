export type LogMessageData = { message: string; messageCode: string };
export type RegisteredLogMessages<T extends string> = {
  [key in T]: RegisteredMessageData<T>;
};

export type LogMessage<T extends string> = {
  message: T;
  sessionId?: string;
} & RegisteredMessageData<T>;

type RegisteredMessageData<T extends string> = {
  messageCode: `TEST_RESOURCES_${T}`;
};
