import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "INVALID_REQUEST"
  | "INTERNAL_SERVER_ERROR"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  INVALID_REQUEST: {
    messageCode: "STS_MOCK_INVALID_REQUEST",
  },
  INTERNAL_SERVER_ERROR: {
    messageCode: "STS_MOCK_INTERNAL_SERVER_ERROR",
  },
  ...commonMessages,
};
