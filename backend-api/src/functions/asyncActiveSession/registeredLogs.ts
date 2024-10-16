import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "AUTHENTICATION_HEADER_INVALID"
  | "FAILED_TO_GET_SUB_FROM_SERVICE_TOKEN"
  | "INTERNAL_SERVER_ERROR"
  | "JWE_DECRYPTION_ERROR"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  AUTHENTICATION_HEADER_INVALID: {
    messageCode: "MOBILE_ASYNC_AUTHENTICATION_HEADER_INVALID",
  },
  FAILED_TO_GET_SUB_FROM_SERVICE_TOKEN: {
    messageCode: "MOBILE_ASYNC_FAILED_TO_GET_SUB_FROM_SERVICE_TOKEN",
  },
  INTERNAL_SERVER_ERROR: {
    messageCode: "MOBILE_ASYNC_INTERNAL_SERVER_ERROR",
  },
  JWE_DECRYPTION_ERROR: {
    messageCode: "MOBILE_ASYNC_JWE_DECRYPTION_ERROR",
  },
  ...commonMessages,
};
