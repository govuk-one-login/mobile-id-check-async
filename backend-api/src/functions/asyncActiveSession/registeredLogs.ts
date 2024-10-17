import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "AUTHENTICATION_HEADER_INVALID"
  | "SERVICE_TOKEN_VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR"
  | "JWE_DECRYPTION_ERROR"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  AUTHENTICATION_HEADER_INVALID: {
    messageCode: "MOBILE_ASYNC_AUTHENTICATION_HEADER_INVALID",
  },
  SERVICE_TOKEN_VALIDATION_ERROR: {
    messageCode: "MOBILE_ASYNC_SERVICE_TOKEN_VALIDATION_ERROR",
  },
  INTERNAL_SERVER_ERROR: {
    messageCode: "MOBILE_ASYNC_INTERNAL_SERVER_ERROR",
  },
  JWE_DECRYPTION_ERROR: {
    messageCode: "MOBILE_ASYNC_JWE_DECRYPTION_ERROR",
  },
  ...commonMessages,
};
