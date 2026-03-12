import { CredentialSubject } from "@govuk-one-login/mobile-id-check-biometric-credential";

export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
export const mockBiometricSessionId = "11111111-1111-1111-1111-111111111111";
export const mockInvalidUUID = "invalid-uuid";
export const mockExpiredSessionId = "mock-expired-session-id";
export const mockInvalidStateSessionId = "mock-invalid-state-session-id";
export const mockClientState = "mockClientState";
export const mockGovukSigninJourneyId = "44444444-4444-4444-4444-444444444444";
export const mockSubjectIdentifier = "mockSubjectIdentifier";
export const expectedSecurityHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};
export const ONE_DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

export const generateRandomString = (): string => {
  return Math.random().toString(36);
};

export const mockCredentialSubject: CredentialSubject = {
  name: [
    {
      nameParts: [
        { type: "GivenName", value: "mockGivenName" },
        { type: "FamilyName", value: "mockFamilyName" },
      ],
    },
  ],
  birthDate: [{ value: "mockBirthDate" }],
  address: [
    {
      uprn: null,
      organisationName: null,
      subBuildingName: null,
      buildingNumber: null,
      buildingName: null,
      dependentStreetName: null,
      streetName: null,
      doubleDependentAddressLocality: null,
      dependentAddressLocality: null,
      addressLocality: null,
      postalCode: "mockPostalCode",
      addressCountry: null,
    },
  ],
  drivingPermit: [
    {
      personalNumber: "mockPersonalNumber",
      issueNumber: null,
      issuedBy: null,
      issueDate: null,
      expiryDate: "mockExpiryDate",
      fullAddress: "mockFullAddress",
    },
  ],
  deviceId: [{ value: "mockDeviceId" }],
};
