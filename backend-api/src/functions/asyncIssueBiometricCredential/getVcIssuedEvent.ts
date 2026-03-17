import {
  Advisory,
  AuditData,
  BiometricCredential,
  ContraIndicatorReason,
  CredentialSubject,
  FailEvidence,
  FlaggedRecord,
  Flags,
  FlagsWrapper,
  PassEvidence,
  TxmaContraIndicator,
} from "@govuk-one-login/mobile-id-check-biometric-credential";
import { BiometricSessionFinishedAttributes } from "../common/session/session";

type VcEvidence = (PassEvidence | FailEvidence) & {
  txmaContraIndicators: TxmaContraIndicator[];
  ciReasons?: ContraIndicatorReason[];
};

export type VcIssuedTxMAEvent = {
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED";
  user: {
    user_id: string;
    session_id: string;
    govuk_signin_journey_id: string;
    transaction_id: string;
  };
  timestamp: number;
  event_timestamp_ms: number;
  component_id: string;
  restricted: CredentialSubject & {
    flaggedRecord?: FlaggedRecord[];
  };
  extensions: {
    redirect_uri?: string;
    evidence: VcEvidence[];
    dcmawFlagsPassport?: Flags;
    dcmawFlagsDL?: Flags;
    dcmawFlagsBRP?: Flags;
    document_expiry?: {
      evaluation_result_code?: AuditAdvisory;
    };
  };
};

export enum AuditAdvisory {
  DRIVING_LICENCE_NOT_EXPIRED = "DOCUMENT_NOT_EXPIRED",
  DRIVING_LICENCE_EXPIRY_WITHIN_GRACE_PERIOD = "DRIVING_LICENCE_EXPIRY_WITHIN_GRACE_PERIOD",
  DRIVING_LICENCE_EXPIRY_BEYOND_GRACE_PERIOD = "DRIVING_LICENCE_EXPIRY_BEYOND_GRACE_PERIOD",
}

export const getVcIssuedEvent = (
  credential: BiometricCredential,
  audit: AuditData,
  session: BiometricSessionFinishedAttributes,
  dvlaDrivingLicenceExpiryGracePeriodInDays: number,
  advisories: Advisory[],
): VcIssuedTxMAEvent => {
  const { contraIndicatorReasons, flaggedRecord, flags, txmaContraIndicators } =
    audit;

  const timestamp_ms = Date.now();
  const timestamp = Math.floor(timestamp_ms / 1000);

  const evaluationResultCode = getDocumentExpiryEvaluationResultCode(
    dvlaDrivingLicenceExpiryGracePeriodInDays,
    advisories,
  );

  return {
    event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
    user: {
      user_id: session.subjectIdentifier,
      session_id: session.sessionId,
      govuk_signin_journey_id: session.govukSigninJourneyId,
      transaction_id: session.biometricSessionId,
    },
    timestamp: timestamp,
    event_timestamp_ms: timestamp_ms,
    component_id: session.issuer,
    restricted: {
      ...credential.credentialSubject,
      ...(hasFlaggedRecord(audit) && { flaggedRecord }),
    },
    extensions: {
      ...(isMobileAppMobileJourney(session) && {
        redirect_uri: session.redirectUri,
      }),
      ...(hasFlags(audit) && {
        ...flags,
      }),
      evidence: [
        {
          ...credential.evidence[0],
          ...(hasContraIndicators(credential) && {
            ciReasons: contraIndicatorReasons,
          }),
          txmaContraIndicators,
        },
      ],
      ...(evaluationResultCode && {
        document_expiry: {
          evaluation_result_code: evaluationResultCode,
        },
      }),
    },
  };
};

const hasContraIndicators = (credential: BiometricCredential): boolean => {
  const credentialEvidence = credential.evidence[0];

  // A user can only prove their identity with one document per session.
  // We therefore only ever issue a credential containing one 'evidence' item.
  if (credential.evidence.length !== 1) return false;
  return "ci" in credentialEvidence && credentialEvidence.ci != null;
};

const hasFlags = (auditData: { flags?: FlagsWrapper }): boolean => {
  return auditData.flags != null;
};

const hasFlaggedRecord = (auditData: {
  flaggedRecord?: FlaggedRecord[];
}): boolean => {
  return auditData.flaggedRecord != null;
};

// redirectUri is only stored in Dynamo for mobile-app-mobile journeys
const isMobileAppMobileJourney = (session: {
  redirectUri?: string;
}): boolean => {
  return session.redirectUri != null;
};

const getDocumentExpiryEvaluationResultCode = (
  dvlaDrivingLicenceExpiryGracePeriodInDays: number,
  advisories: Advisory[],
): AuditAdvisory | null => {
  if (dvlaDrivingLicenceExpiryGracePeriodInDays > 0) {
    const advisory = advisories.find((advisory) =>
      Object.keys(AuditAdvisory).includes(advisory as unknown as AuditAdvisory),
    );

    if (!advisory) return null;
    if (isAuditAdvisory(advisory)) return AuditAdvisory[advisory];
  }
  return null;
};

const isAuditAdvisory = (advisory: unknown): advisory is AuditAdvisory => {
  return Object.keys(AuditAdvisory).includes(advisory as string);
};
