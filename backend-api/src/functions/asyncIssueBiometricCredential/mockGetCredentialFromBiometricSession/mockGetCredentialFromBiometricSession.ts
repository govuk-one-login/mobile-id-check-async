import { Result, successResult } from "../../utils/result";

export const mockGetCredentialFromBiometricSession: IMockGetCredentialFromBiometricSession =
  (_vendorResponse, _fraudCheckData, _options) => {
    return successResult({
      credential: "mockCredential",
      advisories: "mockAdvisories",
      audit: "mockAudit",
      analytics: "mockAnalytics",
    });
  };

export type IMockGetCredentialFromBiometricSession = (
  biometricSession: unknown,
  fraudCheckData: MockFraudCheckData,
  options: MockGetCredentialOptions,
) => Result<MockBiometricCredentialWrapper, MockGetCredentialError>;

export interface MockFraudCheckData {
  userSessionCreatedAt: number;
  opaqueId: string;
}

export interface MockGetCredentialOptions {
  enableUtopiaTestDocuments: boolean;
  enableDrivingLicence: boolean;
  enableNfcPassports: boolean;
  enableBiometricResidencePermit: boolean;
  enableBiometricResidenceCard: boolean;
}

export interface MockBiometricCredentialWrapper {
  credential: string;
  analytics: string;
  audit: string;
  advisories: string;
}

export interface MockGetCredentialError {
  errorCode: MockGetCredentialErrorCode;
  errorReason: MockGetCredentialErrorReason;
  data: object;
}

export enum MockGetCredentialErrorCode {
  PARSE_FAILURE = "BIOMETRIC_SESSION_PARSE_FAILURE",
  VENDOR_LIKENESS_DISABLED = "VENDOR_LIKENESS_DISABLED",
  BIOMETRIC_SESSION_NOT_VALID = "BIOMETRIC_SESSION_NOT_VALID",
  SUSPECTED_FRAUD = "SUSPECTED_FRAUD",
}

export enum MockGetCredentialErrorReason {
  UNEXPECTED_DOCUMENT_TYPE = "UNEXPECTED_DOCUMENT_TYPE",
  MOBILE_ERROR = "MOBILE_BROKE_MESSAGE_CONTRACT",
  VENDOR_ERROR = "VENDOR_BROKE_MESSAGE_CONTRACT",
  BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION = "BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION",
  BIOMETRIC_SESSION_OPAQUEID_MISMATCH = "BIOMETRIC_SESSION_OPAQUEID_MISMATCH",
}
