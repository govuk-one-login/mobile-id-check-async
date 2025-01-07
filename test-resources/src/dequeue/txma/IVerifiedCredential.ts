export interface CredentialSubject {
  name: object[];
  birthDate: object[];
  passport?: Passport[];
  residencePermit?: ResidencePermit[];
  address?: object[];
  drivingPermit?: DrivingPermit[];
  deviceId?: DeviceId[];
  flaggedRecord?: FlaggedRecord[];
}

export interface FlaggedRecord {
  dateOfBirth?: TypeValuePair[];
}

export interface TypeValuePair {
  type: string;
  value: string | null;
}

export type DcmawFlags = {
  [key in DcmawFlagsType]?: Flags;
};

export enum DcmawFlagsType {
  PASSPORT = "dcmawFlagsPassport",
  DRIVERS_LICENCE = "dcmawFlagsDL",
  BRP = "dcmawFlagsBRP",
  INVALID = "invalid",
}

export enum nfcFlagTypes {
  PASSPORT = "dcmawFlagsPassport",
  BRP = "dcmawFlagsBRP",
}

export interface Flags {
  doBUnknown?: boolean;
  doBMonthGreaterThan12?: boolean;
  doBDateGreaterThan31?: boolean;
  doBMoreThan100?: boolean;
  doBMismatched?: boolean;
  doBLicenceCheck?: boolean;
  doEInPast?: boolean | null;
  doEMonthGreaterThan12?: boolean;
  doEDateGreaterThan31?: boolean;
  doEMismatched?: boolean;
  doEGreaterThan31Dec2024?: boolean;
  doIMonthGreaterThan12?: boolean;
  doIDateGreaterThan31?: boolean;
}

export interface DeviceId {
  value: string | null;
}

export interface VerifiedCredential {
  "@context": string[];
  type: string[];
  credentialSubject: CredentialSubject;
  evidence: Array<PassEvidence | FailEvidence>;
}

export interface Passport {
  documentNumber: string | null;
  expiryDate: string | null;
  icaoIssuerCode: string | null;
}

export interface ResidencePermit {
  documentNumber: string | null;
  expiryDate: string | null;
  icaoIssuerCode: string | null;
  documentType: string | null;
}

export interface DrivingPermit {
  personalNumber: string | null;
  issueNumber: string | null;
  issuedBy: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fullAddress: string | null;
}
export interface PassEvidence {
  type: "IdentityCheck";
  txn: string;
  strengthScore: number;
  validityScore: number;
  activityHistoryScore?: number;
  ci?: string[];
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  checkDetails: any[];
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  txmaContraIndicators?: any[];
}
export interface FailEvidence {
  type: "IdentityCheck";
  txn: string;
  strengthScore: number;
  validityScore: number;
  ci: string[];
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  failedCheckDetails: any[];
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  txmaContraIndicators?: any[];
}

export interface CredentialJwt {
  iat: number;
  iss: string;
  nbf: number;
  sub: string;
  aud: string;
  exp?: number;
  jti: string;
  vc: VerifiedCredential;
}

export interface SignedCredentialJwt {
  sub: string;
  "https://vocab.account.gov.uk/v1/credentialJWT": [string];
}
