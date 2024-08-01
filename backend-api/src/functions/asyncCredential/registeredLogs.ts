import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "AUTHENTICATION_HEADER_INVALID"
  | "JWT_CLAIM_INVALID"
  | "ERROR_CREATING_SESSION"
  | "REQUEST_BODY_INVALID"
  | "TOKEN_SIGNATURE_INVALID"
  | "ERROR_RETRIEVING_REGISTERED_CLIENT"
  | "ERROR_RETRIEVING_SESSION"
  | "CLIENT_CREDENTIALS_INVALID"
  | CommonMessageNames;

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
  REQUEST_BODY_INVALID: {
    messageCode: "MOBILE_ASYNC_REQUEST_BODY_INVALID",
  },
  TOKEN_SIGNATURE_INVALID: {
    messageCode: "MOBILE_ASYNC_TOKEN_SIGNATURE_INVALID",
  },
  ERROR_RETRIEVING_REGISTERED_CLIENT: {
    messageCode: "MOBILE_ASYNC_ERROR_RETRIEVING_REGISTERED_CLIENT",
  },
  ERROR_RETRIEVING_SESSION: {
    messageCode: "MOBILE_ASYNC_ERROR_RETRIEVING_SESSION",
  },
  CLIENT_CREDENTIALS_INVALID: {
    messageCode: "MOBILE_ASYNC_CLIENT_CREDENTIALS_INVALID",
  },
  ...commonMessages,
};
