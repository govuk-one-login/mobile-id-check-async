import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | CommonMessageNames
  | "AUTHENTICATION_HEADER_INVALID"
  | "JWT_CLAIM_INVALID"
  | "ERROR_CREATING_SESSION"
  | "SESSION_CREATED";

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  AUTHENTICATION_HEADER_INVALID: {
    messageCode: "MOBILE_ASYNC_AUTHENTICATION_HEADER_INVALID",
  },
  JWT_CLAIM_INVALID: {
    messageCode: "MOBILE_ASYNC_JWT_CLAIM_INVALID",
  },
  ERROR_CREATING_SESSION: {
    messageCode: "MOBILE_ASYNC_ERROR_CREATING_SESSION",
  },
  SESSION_CREATED: {
    messageCode: "MOBILE_ASYNC_SESSION_CREATED",
  },
  ...commonMessages,
};
