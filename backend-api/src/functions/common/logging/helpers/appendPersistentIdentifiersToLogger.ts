import { logger } from "../logger";

export type PersistentIdentifiers = {
  biometricSessionId?: string;
  govukSigninJourneyId?: string;
};

export const appendPersistentIdentifiersToLogger = (
  attributes: PersistentIdentifiers,
): void => {
  logger.appendKeys({ persistentIdentifiers: attributes });
};
