import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName =
  | "BIOMETRIC_TOKEN_REQUEST_BODY_INVALID"
  | CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  BIOMETRIC_TOKEN_REQUEST_BODY_INVALID: {
    messageCode: "MOBILE_ASYNC_BIOMETRIC_TOKEN_REQUEST_BODY_INVALID",
  },
  ...commonMessages,
};
