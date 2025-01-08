import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "FAILED_TO_PROCESS_MESSAGES"
  | "PROCESSED_MESSAGES"
  | "ERROR_WRITING_EVENT_TO_DEQUEUE_TABLE"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  FAILED_TO_PROCESS_MESSAGES: {
    messageCode: "TEST_RESOURCES_FAILED_TO_PROCESS_MESSAGES",
  },
  PROCESSED_MESSAGES: {
    messageCode: "TEST_RESOURCES_PROCESSED_MESSAGES",
  },
  ERROR_WRITING_EVENT_TO_DEQUEUE_TABLE: {
    messageCode: "TEST_RESOURCES_ERROR_WRITING_EVENT_TO_DEQUEUE_TABLE",
  },
  ...commonMessages,
};
