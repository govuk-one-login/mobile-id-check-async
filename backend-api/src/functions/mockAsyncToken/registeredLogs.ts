import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName = "PROXY_REQUEST_ERROR" | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  PROXY_REQUEST_ERROR: {
    messageCode: "MOBILE_ASYNC_PROXY_REQUEST_ERROR",
  },
  ...commonMessages,
};
