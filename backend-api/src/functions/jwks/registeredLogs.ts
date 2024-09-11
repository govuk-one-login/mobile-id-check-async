import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName = "INTERNAL_SERVER_ERROR" | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  INTERNAL_SERVER_ERROR: {
    messageCode: "MOBILE_ASYNC_INTERNAL_SERVER_ERROR",
  },
  ...commonMessages,
};
