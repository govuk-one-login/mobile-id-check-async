import {
  CommonMessageNames,
  commonMessages,
} from "../../services/logging-OLD/commonRegisteredLogs";
import { RegisteredLogMessages } from "../../services/logging-OLD/types";

export type MessageName =
  | CommonMessageNames
  | "INVALID_REQUEST"
  | "INTERNAL_SERVER_ERROR";

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  ...commonMessages,
  INVALID_REQUEST: {
    messageCode: "TEST_RESOURCES_INVALID_REQUEST",
  },
  INTERNAL_SERVER_ERROR: {
    messageCode: "TEST_RESOURCES_INTERNAL_SERVER_ERROR",
  },
};
