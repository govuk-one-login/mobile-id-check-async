import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName = "REQUEST_BODY_INVALID" | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  REQUEST_BODY_INVALID: {
    messageCode: "MOBILE_ASYNC_REQUEST_BODY_INVALID",
  },
  ...commonMessages,
};
