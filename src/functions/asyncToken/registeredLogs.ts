import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/logMessageTypes";

export type MessageName = "INVALID_REQUEST" | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  INVALID_REQUEST: {
    messageCode: "MOBILE_ASYNC_INVALID_REQUEST",
    message: "",
  },
  ...commonMessages,
};
