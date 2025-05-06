import { SessionAttributes } from "../session/session";
import { logger } from "./logger";

export const appendSessionIdentifiers = (
  sessionAttributes: SessionAttributes,
): void => {
  let opaqueId: string | undefined;
  let biometricSessionId: string | undefined;

  const { govukSigninJourneyId, sessionId, subjectIdentifier } =
    sessionAttributes;

  if ("opaqueId" in sessionAttributes) {
    opaqueId = sessionAttributes.opaqueId;
  }
  if ("biometricSessionId" in sessionAttributes) {
    biometricSessionId = sessionAttributes.biometricSessionId;
  }

  logger.appendKeys({
    sessionIdentifiers: {
      biometricSessionId,
      govukSigninJourneyId,
      opaqueId,
      sessionId,
      subjectIdentifier,
    },
  });
};
