export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
export const mockBiometricSessionId = "11111111-1111-1111-1111-111111111111";
export const mockInvalidUUID = "invalid-uuid";
export const mockExpiredSessionId = "mock-expired-session-id";
export const mockInvalidStateSessionId = "mock-invalid-state-session-id";
export const expectedSecurityHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

export const validAuthSessionCreatedSession = {
  sessionId: crypto.randomUUID(),
  sessionState: "ASYNC_AUTH_SESSION_CREATED",
  clientState: "mockClientState",
  govukSigninJourneyId: "mockGovukSigninJourneyId",
  clientId: "mockClientId",
  subjectIdentifier: crypto.randomUUID(),
  createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
  timeToLive: Date.now() + 30 * 60 * 1000, // 30 minutes in the future
};
