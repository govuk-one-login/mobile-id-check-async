import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "STARTED"
  | "COMPLETED"
  | "ENVIRONMENT_VARIABLE_MISSING"
  | "FAILED_TO_PROCESS_MESSAGES"
  | "PROCESSED_MESSAGES"
  | "ERROR_WRITING_EVENT_TO_EVENTS_TABLE";

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  STARTED: {
    messageCode: "DEQUEUE_STARTED",
  },
  COMPLETED: {
    messageCode: "DEQUEUE_COMPLETED",
  },
  ENVIRONMENT_VARIABLE_MISSING: {
    messageCode: "DEQUEUE_ENVIRONMENT_VARIABLE_MISSING",
  },
  FAILED_TO_PROCESS_MESSAGES: {
    messageCode: "DEQUEUE_FAILED_TO_PROCESS_MESSAGES",
  },
  PROCESSED_MESSAGES: {
    messageCode: "DEQUEUE_PROCESSED_MESSAGES",
  },
  ERROR_WRITING_EVENT_TO_EVENTS_TABLE: {
    messageCode: "DEQUEUE_ERROR_WRITING_EVENT_TO_EVENTS_TABLE",
  },
};
