import {
  Logger,
  LogMessageName,
} from "@govuk-one-login/mobile-id-check-biometric-credential";
import { logger } from "../common/logging/logger";

export const getCredentialFromBiometricSessionLogger: Logger = {
  info: (message: LogMessageName, data: Record<string, unknown>): void => {
    logger.info(message, data);
  },
};
