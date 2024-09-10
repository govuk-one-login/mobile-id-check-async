import { RegisteredLogMessages } from "./types";

export type CommonMessageNames =
  | "STARTED"
  | "COMPLETED"

export const commonMessages: RegisteredLogMessages<CommonMessageNames> = {
  STARTED: {
    messageCode: "STS_MOCK_STARTED",
  },
  COMPLETED: {
    messageCode: "STS_MOCK_COMPLETED",
  }
};
