import { RegisteredLogMessages } from "./types";

export type CommonMessageNames =
  | "STARTED"
  | "COMPLETED"
  | "ENVIRONMENT_VARIABLE_MISSING";

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
};
