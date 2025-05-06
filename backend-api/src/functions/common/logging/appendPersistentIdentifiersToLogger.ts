import { logger } from "./logger";

export const appendPersistentIdentifiersToLogger = (attributes: {
  biometricSessionId?: string;
  govukSigninJourneyId?: string;
  sessionId?: string;
}): void => {
  logger.appendKeys({ persistentIdentifiers: attributes });
};
