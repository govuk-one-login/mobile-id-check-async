import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName = "AUTHENTICATION_HEADER_INVALID" | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  AUTHENTICATION_HEADER_INVALID: {
    messageCode: "MOBILE_ASYNC_AUTHENTICATION_HEADER_INVALID",
  },
  ...commonMessages,
};
