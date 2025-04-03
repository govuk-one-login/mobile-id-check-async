import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging-OLD/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging-OLD/types";

export type MessageName = CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  ...commonMessages,
};
