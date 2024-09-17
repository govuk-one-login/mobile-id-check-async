import { RegisteredLogMessages } from "./types";

export type CommonMessageNames = "STARTED" | "COMPLETED" | "ENVIRONMENT_VARIABLE_MISSING";

export const commonMessages: RegisteredLogMessages<CommonMessageNames> = {
  STARTED: {
    messageCode: "STS_MOCK_STARTED",
  },
  COMPLETED: {
    messageCode: "STS_MOCK_COMPLETED",
  },
  ENVIRONMENT_VARIABLE_MISSING: {
    messageCode: "STS_MOCK_ENVIRONMENT_VARIABLE_MISSING",
  },
};
