import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | CommonMessageNames
  | "FAILED_TO_PROCESS_MESSAGES"
  | "PROCESSED_MESSAGES"
  | "ERROR_WRITING_EVENT_TO_EVENTS_TABLE";

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  ...commonMessages,
  FAILED_TO_PROCESS_MESSAGES: {
    messageCode: "TEST_RESOURCES_FAILED_TO_PROCESS_MESSAGES",
  },
  PROCESSED_MESSAGES: {
    messageCode: "TEST_RESOURCES_PROCESSED_MESSAGES",
  },
  ERROR_WRITING_EVENT_TO_EVENTS_TABLE: {
    messageCode: "TEST_RESOURCES_ERROR_WRITING_EVENT_TO_EVENTS_TABLE",
  },
};
