import { RegisteredLogMessages } from "./types";

export type CommonMessageNames =
  | "STARTED"
  | "COMPLETED"
  | "ENVIRONMENT_VARIABLE_MISSING"
  | "ERROR_WRITING_AUDIT_EVENT"
  | "ERROR_SENDING_CUSTOM_RESOURCE_EVENT";

export const commonMessages: RegisteredLogMessages<CommonMessageNames> = {
  STARTED: {
    messageCode: "MOBILE_ASYNC_STARTED",
  },
  COMPLETED: {
    messageCode: "MOBILE_ASYNC_COMPLETED",
  },
  ENVIRONMENT_VARIABLE_MISSING: {
    messageCode: "MOBILE_ASYNC_ENVIRONMENT_VARIABLE_MISSING",
  },
  ERROR_WRITING_AUDIT_EVENT: {
    messageCode: "MOBILE_ASYNC_ERROR_WRITING_AUDIT_EVENT",
  },
  ERROR_SENDING_CUSTOM_RESOURCE_EVENT: {
    messageCode: "MOBILE_ASYNC_ERROR_SENDING_CUSTOM_RESOURCE_EVENT",
  },
};
