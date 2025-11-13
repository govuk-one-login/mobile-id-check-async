import { logger } from "../logger";

export const appendPersistentIdentifiersToLogger = (attributes: {
  biometricSessionId?: string;
  govukSigninJourneyId?: string;
  sessionId?: string; // TODO: remove this after sessionId stops being logged in all the lambdas.
}): void => {
  logger.appendKeys({ persistentIdentifiers: attributes });
};
