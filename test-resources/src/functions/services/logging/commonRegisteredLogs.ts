import { RegisteredLogMessages } from "./types";

export type CommonMessageNames =
  | "STARTED"
  | "COMPLETED"
  | "ENVIRONMENT_VARIABLE_MISSING";

export const commonMessages: RegisteredLogMessages<CommonMessageNames> = {
  STARTED: {
    messageCode: "TEST_RESOURCES_STARTED",
  },
  COMPLETED: {
    messageCode: "TEST_RESOURCES_COMPLETED",
  },
  ENVIRONMENT_VARIABLE_MISSING: {
    messageCode: "TEST_RESOURCES_ENVIRONMENT_VARIABLE_MISSING",
  },
};
