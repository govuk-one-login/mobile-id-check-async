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
    messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
  },
  INTERNAL_SERVER_ERROR: {
    messageCode: "MOBILE_ASYNC_INTERNAL_SERVER_ERROR",
  },
  ...commonMessages,
};
