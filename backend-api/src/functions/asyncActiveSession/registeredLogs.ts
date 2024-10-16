import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "INVALID_AUTHENTICATION_HEADER"
  | "SERVICE_TOKEN_VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR"
  | "JWE_DECRYPTION_ERROR"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  INVALID_AUTHENTICATION_HEADER: {
    messageCode: "MOBILE_ASYNC_INVALID_AUTHENTICATION_HEADER",
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
