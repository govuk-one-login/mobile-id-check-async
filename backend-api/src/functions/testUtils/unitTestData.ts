import { SessionState } from "../common/session/session";
import { SessionRegistry } from "../common/session/SessionRegistry";
import { IEventService } from "../services/events/types";

export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
export const mockBiometricSessionId = "f32432a9-0965-4da9-8a2c-a98a79349d4a";
export const mockInvalidUUID = "mockInvalidUUID";

export const expectedSecurityHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export const NOW_IN_MILLISECONDS: number = 1704110400000; // 2024-01-01 12:00:00.000

export const mockInertSessionRegistry: SessionRegistry = {
  updateSession: jest.fn(() => {
    throw new Error("Not implemented");
  }),
};

export const mockInertEventService: IEventService = {
  writeGenericEvent: jest.fn(() => {
    throw new Error("Not implemented");
  }),
  writeCredentialTokenIssuedEvent: jest.fn(() => {
    throw new Error("Not implemented");
  }),
  writeBiometricTokenIssuedEvent: jest.fn(() => {
    throw new Error("Not implemented");
  }),
};

export const validBaseSessionAttributes = {
  clientId: "mockClientId",
  govukSigninJourneyId: "mockGovukSigninJourneyId",
  createdAt: 12345,
  issuer: "mockIssuer",
  sessionId: mockSessionId,
  sessionState: SessionState.AUTH_SESSION_CREATED,
  clientState: "mockClientState",
  subjectIdentifier: "mockSubjectIdentifier",
  timeToLive: 12345,
};

export const validBiometricTokenIssuedSessionAttributes = {
  ...validBaseSessionAttributes,
  sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
  documentType: "NFC_PASSPORT",
  opaqueId: "mockOpaqueId",
};

export const validBiometricSessionFinishedAttributes = {
  ...validBiometricTokenIssuedSessionAttributes,
  sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
  biometricSessionId: mockBiometricSessionId,
};
