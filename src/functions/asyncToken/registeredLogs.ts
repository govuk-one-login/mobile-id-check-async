import { RegisteredLogMessages } from "../services/logging/types";


type CommonMessageNames = "STARTED"
export type MessageName = "ENVIRONMENT_VARIABLE_MISSING" | CommonMessageNames

const commonMessages: RegisteredLogMessages<CommonMessageNames> = {
  STARTED: {
    messageCode: "MOBILE_ASYNC_STARTED",
    message: ""
  }
}
export const registeredLogs: RegisteredLogMessages<MessageName> = {
  ENVIRONMENT_VARIABLE_MISSING: {
    messageCode: "MOBILE_ASYNC_ENVIRONMENT_VARIABLE_MISSING",
    message: "",
  },
  ...commonMessages
};
