export type LogMessageData = { message: string; messageCode: string };
export type RegisteredLogMessages<T extends string> = {
  [key in T]: RegisteredMessageData<T>;
};

export type LogMessage<T extends string> = {
  message: T;
} & RegisteredMessageData<T>;

type RegisteredMessageData<T extends string> = {
  messageCode: `DEQUEUE_${T}`;
};
