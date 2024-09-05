import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "PROXY_REQUEST_ERROR"
  | "UNEXPECTED_RESOURCE_PATH"
  | "UNEXPECTED_RESOURCE_METHOD"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  PROXY_REQUEST_ERROR: {
    messageCode: "MOBILE_ASYNC_PROXY_REQUEST_ERROR",
  },
  UNEXPECTED_RESOURCE_PATH: {
    messageCode: "MOBILE_ASYNC_UNEXPECTED_RESOURCE_PATH",
  },
  UNEXPECTED_RESOURCE_METHOD: {
    messageCode: "MOBILE_ASYNC_UNEXPECTED_RESOURCE_METHOD",
  },
  ...commonMessages,
};
