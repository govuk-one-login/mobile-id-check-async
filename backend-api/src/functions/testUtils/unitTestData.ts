import {
  AnalyticsData,
  BiometricCredential,
  CredentialSubject,
} from "@govuk-one-login/mobile-id-check-biometric-credential";
import { SessionState } from "../common/session/session";
import { SessionRegistry } from "../common/session/SessionRegistry/SessionRegistry";
import { IEventService, VcIssuedEvidence } from "../services/events/types";
import {
  emptyFailure,
  emptySuccess,
  errorResult,
  successResult,
} from "../utils/result";

export const mockSessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
export const mockBiometricSessionId = "f32432a9-0965-4da9-8a2c-a98a79349d4a";
export const mockInvalidUUID = "invalid-uuid";
export const mockGovukSigninJourneyId = "mockGovukSigninJourneyId";
export const mockSubjectIdentifier = "mockSubjectIdentifier";
export const mockClientState = "mockClientState";
export const mockIssuer = "mockIssuer";
export const mockRedirectUri = "https://www.mockRedirectUri.com";
export const mockKeyId = "mockKid";
export const activeSessionReadScope = "idCheck.activeSession.read";
export const mockSqsInboundMessageId = "mockSqsInboundMessageId";
export const mockSqsResponseMessageId = "mockSqsResponseMessageId";
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

export const mockVcIssuedEvidence: VcIssuedEvidence[] = [
  {
    type: "IdentityCheck",
    txn: "mockTxn",
    strengthScore: 0,
    validityScore: 0,
    activityHistoryScore: 0,
    checkDetails: [
      {
        checkMethod: "bvr",
        identityCheckPolicy: "published",
        activityFrom: undefined,
        biometricVerificationProcessLevel: 0,
      },
    ],
    txmaContraIndicators: [],
  },
];

export const mockBiometricCredential: BiometricCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://identity.gov.uk/credentials/v1",
  ],
  type: ["mockCredentialType"],
  credentialSubject: mockCredentialSubject,
  evidence: mockVcIssuedEvidence,
};

export const mockAuditWithFlags = {
  contraIndicatorReasons: [],
  txmaContraIndicators: [],
  flags: ["FLAG_1", "FLAG_2"],
  flaggedRecord: {
    mockKey: "mockValue",
  },
};

export const mockGetCredentialFromBiometricSessionWithFlags = jest
  .fn()
  .mockReturnValue(
    successResult({
      credential: mockBiometricCredential,
      analytics: "mockAnalytics",
      audit: mockAuditWithFlags,
      advisories: "mockAdvisories",
    }),
  );

// This is a simulated, not cryptographically valid, DER-encoded signature
export const mockDerSignature = Buffer.from([
  48,
  69, // SEQUENCE
  2,
  33, // INTEGER (R)
  0x00, // Leading zero for R > 127
  ...Array(32).fill(0x42), // Mock R value
  2,
  32, // INTEGER (S)
  ...Array(32).fill(0x24), // Mock S value
]);

export const validBaseSessionAttributes = {
  clientId: "mockClientId",
  govukSigninJourneyId: mockGovukSigninJourneyId,
  createdAt: validCreatedAt,
  issuer: mockIssuer,
  sessionId: mockSessionId,
  sessionState: SessionState.AUTH_SESSION_CREATED,
  clientState: mockClientState,
  subjectIdentifier: mockSubjectIdentifier,
  timeToLive: 12345,
};

export const invalidBaseSessionAttributeTypes = {
  clientId: "mockClientId",
  govukSigninJourneyId: mockGovukSigninJourneyId,
  createdAt: validCreatedAt,
  issuer: 12345, // Invalid type
  sessionId: mockSessionId,
  sessionState: SessionState.AUTH_SESSION_CREATED,
  clientState: mockClientState,
  subjectIdentifier: mockSubjectIdentifier,
  timeToLive: "12345", // Invalid type
};

export const invalidBaseSessionAttributeSessionState = {
  clientId: "mockClientId",
  govukSigninJourneyId: mockGovukSigninJourneyId,
  createdAt: validCreatedAt,
  issuer: mockIssuer,
  sessionId: mockSessionId,
  sessionState: SessionState.AUTH_SESSION_ABORTED, // Invalid state
  clientState: mockClientState,
  subjectIdentifier: mockSubjectIdentifier,
  timeToLive: 12345,
};

export const validBiometricTokenIssuedSessionAttributes = {
  ...validBaseSessionAttributes,
  sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
  documentType: "NFC_PASSPORT",
  opaqueId: "mockOpaqueId",
};

export const validBiometricTokenIssuedSessionAttributesMobileApp = {
  ...validBiometricTokenIssuedSessionAttributes,
  redirectUri: mockRedirectUri,
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
  redirectUri: mockRedirectUri,
};

export const validAbortSessionAttributes = {
  ...validBiometricTokenIssuedSessionAttributes,
  sessionState: SessionState.AUTH_SESSION_ABORTED,
};

export const validAbortSessionAttributesMobileApp = {
  ...validBiometricSessionFinishedAttributes,
  redirectUri: mockRedirectUri,
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

export const mockFailingCriEventService = {
  ...mockInertEventService,
  writeGenericEvent: jest.fn((params) => {
    if (params.eventName === "DCMAW_ASYNC_CRI_END") {
      return Promise.resolve(errorResult({ errorMessage: "Mock error" }));
    } else {
      return Promise.resolve(emptySuccess());
    }
  }),
};

export const mockSendMessageToSqsSuccess = jest
  .fn()
  .mockResolvedValue(successResult(mockSqsResponseMessageId));

export const mockSendMessageToSqsFailure = jest
  .fn()
  .mockResolvedValue(emptyFailure());

export const mockGetBiometricSessionSuccess = jest
  .fn()
  .mockResolvedValue(successResult("mockBiometricSession"));

export const mockAnalyticsData: AnalyticsData = {
  scanType: "NFC",
  visualVerification: "mockVisualVerification",
  documentType: "DriversLicence",
};
export const mockAuditData = {
  contraIndicatorReasons: [],
  txmaContraIndicators: [],
};
