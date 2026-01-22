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

export const txmaEventDrivingLicenceInDate = {
  user: {
    user_id: "8cc76240-8007-4376-9cd1-e5a0b5c32ac6", // YES (sub)
    session_id: "63e37252-1c6e-4fcd-89b5-7a9303c19f28", // YES (sessionId)
    govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444", // yes
    transaction_id: "ee7a7c29-7a4a-4b48-888d-0c0360d3b850", // no
  },
  timestamp: 1768990682, // no
  event_timestamp_ms: 1768990682790, // no
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED", // yes
  component_id: "https://review-b-async.dev.account.gov.uk", // yes
  restricted: {
    name: [
      {
        nameParts: [
          // yes - array exists
          { type: "GivenName", value: "Joe" },
          { type: "GivenName", value: "Shmoe" },
          { type: "FamilyName", value: "Doe The Ball" },
        ],
      },
    ],
    birthDate: [{ value: "1985-02-08" }], // yes - 1 item is in the array
    deviceId: [{ value: "fb03ce33-6cb4-4b27-b428-f614eba26dd0" }], // no
    drivingPermit: [
      // yes - object is present
      {
        personalNumber: "DOE99802085J99FG",
        expiryDate: "2030-01-18", // yes - value is a string
        issueDate: "2022-05-29",
        issueNumber: null,
        issuedBy: "DVLA", // yes - exact match
        fullAddress: "WHATEVER STREET, WIRRAL, CH1 1AQ",
      },
    ],
    address: [
      // yes - array has one item
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
        postalCode: "CH1 1AQ",
        addressCountry: null,
      },
    ],
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com", // yes - redirectUri
    evidence: [
      {
        type: "IdentityCheck", // yes
        txn: "9930669c-c6c6-434b-b551-75fc5f081bcd",
        strengthScore: 3, // yes
        validityScore: 2, // yes
        activityHistoryScore: 1, //yes
        checkDetails: [
          {
            checkMethod: "vri",
            identityCheckPolicy: "published",
            activityFrom: "2022-05-29",
          },
          { biometricVerificationProcessLevel: 3, checkMethod: "bvr" }, // yes
        ],
        txmaContraIndicators: [],
      },
    ],
    document_expiry:
      {
        evaluation: "DOCUMENT_NOT_EXPIRED"
      },
  }
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// some of this below can be replaced with actual values extracted in credentialResult.test.ts
// but obviously don't have them here
export const expectedEventDrivingLicenceInDate = {
  user: {
    user_id: expect.any(String), // YES (sub)
    session_id: expect.stringMatching(uuidRegex), // YES (sessionId)
    govuk_signin_journey_id: expect.stringMatching(uuidRegex), // yes
  },
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED", // yes
  // component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`, // yes
  component_id: `https://review-b-async.dev.account.gov.uk`, // yes
  restricted: {
    name: [
      {
        nameParts: expect.any(Array)
      },
    ],
    birthDate: expect.arrayContaining([
      expect.any(Object)
    ]), // yes - 1 item is in the array
    drivingPermit: expect.arrayContaining([
      expect.objectContaining(
        {
          expiryDate: expect.any(String), // yes - value is a string
          issuedBy: "DVLA", // yes - exact match
        }),
    ]),
    address: expect.arrayContaining([
      expect.any(Object)
    ]),
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com", // yes - redirectUri
    evidence: [
      {
        type: "IdentityCheck", // yes
        strengthScore: 3, // yes
        validityScore: 2, // yes
        activityHistoryScore: 1, //yes
        checkDetails: expect.arrayContaining([
          expect.objectContaining(
            { biometricVerificationProcessLevel: 3, checkMethod: "bvr" }, // yes
          )
        ]),
      },
    ],
    document_expiry:
      {
        evaluation: "DOCUMENT_NOT_EXPIRED"
      },
  },
};

export const txmaEventDrivingLicenceExpiredInGracePeriod = {
  user: {
    user_id: "8cc76240-8007-4376-9cd1-e5a0b5c32ac6", // YES (sub)
    session_id: "63e37252-1c6e-4fcd-89b5-7a9303c19f28", // YES (sessionId)
    govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444", // yes
    transaction_id: "ee7a7c29-7a4a-4b48-888d-0c0360d3b850", // no
  },
  timestamp: 1768990682, // no
  event_timestamp_ms: 1768990682790, // no
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED", // yes
  component_id: "https://review-b-async.dev.account.gov.uk", // yes
  restricted: {
    name: [
      {
        nameParts: [
          // yes - array exists
          { type: "GivenName", value: "Joe" },
          { type: "GivenName", value: "Shmoe" },
          { type: "FamilyName", value: "Doe The Ball" },
        ],
      },
    ],
    birthDate: [{ value: "1985-02-08" }], // yes - 1 item is in the array
    deviceId: [{ value: "fb03ce33-6cb4-4b27-b428-f614eba26dd0" }], // no
    drivingPermit: [
      // yes - object is present
      {
        personalNumber: "DOE99802085J99FG",
        expiryDate: "2026-01-18", // yes - value is a string
        issueDate: "2022-05-29",
        issueNumber: null,
        issuedBy: "DVLA", // yes - exact match
        fullAddress: "WHATEVER STREET, WIRRAL, CH1 1AQ",
      },
    ],
    address: [
      // yes - array has one item
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
        postalCode: "CH1 1AQ",
        addressCountry: null,
      },
    ],
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com", // yes - redirectUri
    evidence: [
      {
        type: "IdentityCheck", // yes
        txn: "9930669c-c6c6-434b-b551-75fc5f081bcd",
        strengthScore: 3, // yes
        validityScore: 2, // yes
        activityHistoryScore: 1, //yes
        checkDetails: [
          {
            checkMethod: "vri",
            identityCheckPolicy: "published",
            activityFrom: "2022-05-29",
          },
          { biometricVerificationProcessLevel: 3, checkMethod: "bvr" }, // yes
        ],
        txmaContraIndicators: [],
      },
    ],
    document_expiry:
      {
        evaluation: "DOCUMENT_EXPIRED_WITHIN_GRACE_PERIOD"
      },
  },
};

export const expectedEventDrivingLicenceExpiredInGracePeriod = {
  user: {
    user_id: expect.any(String), // YES (sub)
    session_id: expect.stringMatching(uuidRegex), // YES (sessionId)
    govuk_signin_journey_id: expect.stringMatching(uuidRegex), // yes
  },
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED", // yes
  // component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`, // yes
  component_id: `https://review-b-async.dev.account.gov.uk`, // yes
  restricted: {
    name: [
      {
        nameParts: expect.any(Array)
      },
    ],
    birthDate: expect.arrayContaining([
      expect.any(Object)
    ]), // yes - 1 item is in the array
    drivingPermit: expect.arrayContaining([
      expect.objectContaining(
        {
          expiryDate: expect.any(String), // yes - value is a string
          issuedBy: "DVLA", // yes - exact match
        }),
    ]),
    address: expect.arrayContaining([
      expect.any(Object)
    ]),
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com", // yes - redirectUri
    evidence: [
      {
        type: "IdentityCheck", // yes
        strengthScore: 3, // yes
        validityScore: 2, // yes
        activityHistoryScore: 1, //yes
        checkDetails: expect.arrayContaining([
          expect.objectContaining(
            { biometricVerificationProcessLevel: 3, checkMethod: "bvr" }, // yes
          )
        ]),
      },
    ],
    document_expiry:
      {
        evaluation: "DOCUMENT_EXPIRED_WITHIN_GRACE_PERIOD"
      },
  },
};

export const txmaEventDrivingLicenceExpiredBeyondGracePeriod = {
  user: {
    user_id: "8cc76240-8007-4376-9cd1-e5a0b5c32ac6", // YES (sub)
    session_id: "63e37252-1c6e-4fcd-89b5-7a9303c19f28", // YES (sessionId)
    govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444", // yes
    transaction_id: "ee7a7c29-7a4a-4b48-888d-0c0360d3b850", // no
  },
  timestamp: 1768990682, // no
  event_timestamp_ms: 1768990682790, // no
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED", // yes
  component_id: "https://review-b-async.dev.account.gov.uk", // yes
  restricted: {
    name: [
      {
        nameParts: [
          // yes - array exists
          { type: "GivenName", value: "Joe" },
          { type: "GivenName", value: "Shmoe" },
          { type: "FamilyName", value: "Doe The Ball" },
        ],
      },
    ],
    birthDate: [{ value: "1985-02-08" }], // yes - 1 item is in the array
    deviceId: [{ value: "fb03ce33-6cb4-4b27-b428-f614eba26dd0" }], // no
    drivingPermit: [
      // yes - object is present
      {
        personalNumber: "DOE99802085J99FG",
        expiryDate: "2023-01-18", // yes - value is a string
        issueDate: "2022-05-29",
        issueNumber: null,
        issuedBy: "DVLA", // yes - exact match
        fullAddress: "WHATEVER STREET, WIRRAL, CH1 1AQ",
      },
    ],
    address: [
      // yes - array has one item
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
        postalCode: "CH1 1AQ",
        addressCountry: null,
      },
    ],
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com", // yes - redirectUri
    evidence: [
      {
        type: "IdentityCheck", // yes
        txn: "9930669c-c6c6-434b-b551-75fc5f081bcd",
        strengthScore: 3, // yes
        validityScore: 0, // yes
        activityHistoryScore: 0, //yes
        checkDetails: [
          {
            checkMethod: "vri",
            identityCheckPolicy: "published",
            activityFrom: "2022-05-29",
          },
          { biometricVerificationProcessLevel: 3, checkMethod: "bvr" }, // yes
        ],
        txmaContraIndicators: [],
      },
    ],
    document_expiry:
      {
        evaluation: "DOCUMENT_EXPIRED_BEYOND_GRACE_PERIOD"
      },
  },
};

export const expectedEventDrivingLicenceExpiredBeyondGracePeriod = {
  user: {
    user_id: expect.any(String), // YES (sub)
    session_id: expect.stringMatching(uuidRegex), // YES (sessionId)
    govuk_signin_journey_id: expect.stringMatching(uuidRegex), // yes
  },
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED", // yes
  // component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`, // yes
  component_id: `https://review-b-async.dev.account.gov.uk`, // yes
  restricted: {
    name: [
      {
        nameParts: expect.any(Array)
      },
    ],
    birthDate: expect.arrayContaining([
      expect.any(Object)
    ]), // yes - 1 item is in the array
    drivingPermit: expect.arrayContaining([
      expect.objectContaining(
        {
          expiryDate: expect.any(String), // yes - value is a string
          issuedBy: "DVLA", // yes - exact match
        }),
    ]),
    address: expect.arrayContaining([
      expect.any(Object)
    ]),
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com", // yes - redirectUri
    evidence: [
      {
        type: "IdentityCheck", // yes
        strengthScore: 3, // yes
        validityScore: 0, // yes
        activityHistoryScore: 0, //yes
        checkDetails: expect.arrayContaining([
          expect.objectContaining(
            { biometricVerificationProcessLevel: 3, checkMethod: "bvr" }, // yes
          )
        ]),
      },
    ],
    document_expiry:
      {
        evaluation: "DOCUMENT_EXPIRED_BEYOND_GRACE_PERIOD"
      },
  },
};