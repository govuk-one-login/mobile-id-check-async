import {
  CommonMessageNames,
  commonMessages,
} from "../services/logging/commonRegisteredLogs";
import { RegisteredLogMessages } from "../services/logging/types";

export type MessageName = CommonMessageNames;

export const registeredLogs: RegisteredLogMessages<MessageName> = {
  ...commonMessages,
};
