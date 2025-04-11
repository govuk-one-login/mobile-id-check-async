import { SessionState } from "../common/session/session";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import { IEventService } from "../services/events/types";
import { emptyFailure, emptySuccess, errorResult } from "../utils/result";

export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
export const mockBiometricSessionId = "f32432a9-0965-4da9-8a2c-a98a79349d4a";
export const mockInvalidUUID = "invalid-uuid";

export const expectedSecurityHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export const NOW_IN_MILLISECONDS: number = 1704110400000; // 2024-01-01 12:00:00.000
export const NOW_IN_SECONDS: number = 1704110400; // 2024-01-01 12:00:00
export const ONE_HOUR_IN_FUTURE_IN_MILLISECONDS = 1704114000000; // 2024-01-01 13:00:00.000
export const ONE_HOUR_IN_FUTURE_IN_SECONDS = 1704114000; // 2024-01-01 13:00:00
export const ONE_HOUR_AGO_IN_MILLISECONDS = 1704106800000; // 2024-01-01 11:00:00.000

export const validCreatedAt: number = 1704106860000; // 2024-01-01 11:01:00.000
export const invalidCreatedAt: number = 1704106740000; // 2024-01-01 10:59:00.000

export const validBaseSessionAttributes = {
  clientId: "mockClientId",
  govukSigninJourneyId: "mockGovukSigninJourneyId",
  createdAt: validCreatedAt,
  issuer: "mockIssuer",
  sessionId: mockSessionId,
  sessionState: SessionState.AUTH_SESSION_CREATED,
  clientState: "mockClientState",
  subjectIdentifier: "mockSubjectIdentifier",
  timeToLive: 12345,
};

export const invalidBaseSessionAttributeTypes = {
  clientId: "mockClientId",
  govukSigninJourneyId: "mockGovukSigninJourneyId",
  createdAt: validCreatedAt,
  issuer: 12345, // Invalid type
  sessionId: mockSessionId,
  sessionState: SessionState.AUTH_SESSION_CREATED,
  clientState: "mockClientState",
  subjectIdentifier: "mockSubjectIdentifier",
  timeToLive: "12345", // Invalid type
};

export const validBiometricTokenIssuedSessionAttributes = {
  ...validBaseSessionAttributes,
  sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
  documentType: "NFC_PASSPORT",
  opaqueId: "mockOpaqueId",
};

export const validBiometricTokenIssuedSessionAttributesMobileApp = {
  ...validBiometricTokenIssuedSessionAttributes,
  redirectUri: "https://www.mockRedirectUri.com",
};

export const invalidBiometricTokenIssuedSessionAttributesWrongSessionState = {
  ...validBiometricTokenIssuedSessionAttributes,
  sessionState: SessionState.AUTH_SESSION_CREATED,
};

export const invalidBiometricTokenIssuedSessionAttributeTypes = {
  ...validBiometricTokenIssuedSessionAttributes,
  issuer: invalidBaseSessionAttributeTypes.issuer,
  timeToLive: invalidBaseSessionAttributeTypes.timeToLive,
};

export const validBiometricSessionFinishedAttributes = {
  ...validBiometricTokenIssuedSessionAttributes,
  sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
  biometricSessionId: mockBiometricSessionId,
};

export const validBiometricSessionFinishedAttributesMobileApp = {
  ...validBiometricSessionFinishedAttributes,
  redirectUri: "https://www.mockRedirectUri.com",
};

export const validAbortSessionAttributes = {
  ...validBiometricTokenIssuedSessionAttributes,
  sessionState: SessionState.AUTH_SESSION_ABORTED,
};

export const validAbortSessionAttributesMobileApp = {
  ...validBiometricSessionFinishedAttributes,
  redirectUri: "https://www.mockRedirectUri.com",
};

export const validResultSentAttributes = {
  ...validBiometricSessionFinishedAttributes,
  sessionState: SessionState.RESULT_SENT,
};

export const mockInertSessionRegistry: SessionRegistry = {
  updateSession: jest.fn(() => {
    throw new Error("Not implemented");
  }),

  getSession: jest.fn(() => {
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

export const mockWriteGenericEventSuccessResult = jest
  .fn()
  .mockResolvedValue(emptySuccess());

export const mockWriteGenericEventFailureResult = jest
  .fn()
  .mockResolvedValue(errorResult(new Error("Failed to write event")));

export const mockWriteBiometricTokenIssuedEventSuccessResult = jest
  .fn()
  .mockResolvedValue(emptySuccess());

export const mockSuccessfulEventService = {
  ...mockInertEventService,
  writeGenericEvent: mockWriteGenericEventSuccessResult,
  writeBiometricTokenIssuedEvent:
    mockWriteBiometricTokenIssuedEventSuccessResult,
};

export const mockFailingEventService = {
  ...mockInertEventService,
  writeGenericEvent: mockWriteGenericEventFailureResult,
};

export const mockSuccessfulSendMessageToSqs = jest
  .fn()
  .mockResolvedValue(emptySuccess());

export const mockFailingSendMessageToSqs = jest
  .fn()
  .mockResolvedValue(emptyFailure());
