import { Result } from "../../utils/result";

export type IGetCredentialFromBiometricSession = (
  biometricSession: unknown,
  fraudCheckData: FraudCheckData,
  options: GetCredentialOptions,
) => Result<BiometricCredentialWrapper, GetCredentialError>;

export interface FraudCheckData {
  userSessionCreatedAt: number;
  opaqueId: string;
}

export interface GetCredentialOptions {
  enableUtopiaTestDocument: boolean;
  enableDrivingLicence: boolean;
  enableNfcPassport: boolean;
  enableBiometricResidencePermit: boolean;
  enableBiometricResidenceCard: boolean;
}

export interface BiometricCredentialWrapper {
  credential: string;
  analytics: string;
  audit: string;
  advisories: string;
}

export interface GetCredentialError {
  errorCode: GetCredentialErrorCode;
  errorReason: GetCredentialErrorReason;
  data: object;
}

export enum GetCredentialErrorCode {
  PARSE_FAILURE = "BIOMETRIC_SESSION_PARSE_FAILURE",
  VENDOR_LIKENESS_DISABLED = "VENDOR_LIKENESS_DISABLED",
  BIOMETRIC_SESSION_NOT_VALID = "BIOMETRIC_SESSION_NOT_VALID",
  SUSPECTED_FRAUD = "SUSPECTED_FRAUD",
}

export enum GetCredentialErrorReason {
  UNEXPECTED_DOCUMENT_TYPE = "UNEXPECTED_DOCUMENT_TYPE",
  MOBILE_ERROR = "MOBILE_BROKE_MESSAGE_CONTRACT",
  VENDOR_ERROR = "VENDOR_BROKE_MESSAGE_CONTRACT",
  BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION = "BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION",
  BIOMETRIC_SESSION_OPAQUEID_MISMATCH = "BIOMETRIC_SESSION_OPAQUEID_MISMATCH",
}
