import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "PROXY_REQUEST_ERROR"
  | "UNEXPECTED_PATH"
  | "UNEXPECTED_HTTP_METHOD"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  PROXY_REQUEST_ERROR: {
    messageCode: "MOBILE_ASYNC_PROXY_REQUEST_ERROR",
  },
  UNEXPECTED_PATH: {
    messageCode: "MOBILE_ASYNC_UNEXPECTED_PATH",
  },
  UNEXPECTED_HTTP_METHOD: {
    messageCode: "MOBILE_ASYNC_UNEXPECTED_HTTP_METHOD",
  },
  ...commonMessages,
};
