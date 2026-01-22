export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
export const mockBiometricSessionId = "11111111-1111-1111-1111-111111111111";
export const mockInvalidUUID = "invalid-uuid";
export const mockExpiredSessionId = "mock-expired-session-id";
export const mockInvalidStateSessionId = "mock-invalid-state-session-id";
export const mockClientState = "mockClientState";
export const mockGovukSigninJourneyId = "44444444-4444-4444-4444-444444444444";
export const expectedSecurityHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// some of this below can be replaced with actual values extracted in credentialResult.test.ts
// but obviously don't have them here
export const expectedEventDrivingLicenceSuccess = {
  user: {
    user_id: expect.any(String), // YES (sub)
    session_id: expect.stringMatching(uuidRegex), // YES (sessionId)
    govuk_signin_journey_id: expect.stringMatching(uuidRegex),
  },
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
  // component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`, // yes
  component_id: `https://review-b-async.dev.account.gov.uk`,
  restricted: {
    name: [
      {
        nameParts: expect.any(Array)
      },
    ],
    birthDate: expect.arrayContaining([
      expect.any(Object)
    ]),
    drivingPermit: expect.arrayContaining([
      expect.objectContaining(
        {
          expiryDate: expect.any(String),
          issuedBy: "DVLA",
        }),
    ]),
    address: expect.arrayContaining([
      expect.any(Object)
    ]),
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com",
    evidence: [
      {
        type: "IdentityCheck",
        strengthScore: 3,
        validityScore: 2,
        activityHistoryScore: 1,
        checkDetails: expect.arrayContaining([
          expect.objectContaining(
            { biometricVerificationProcessLevel: 3, checkMethod: "bvr" },
          )
        ]),
      },
    ],
  },
};