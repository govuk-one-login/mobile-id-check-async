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
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { BiometricSessionFinishedAttributes } from "../common/session/session";
import { emptyFailure, Result, successResult } from "../utils/result";

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
      evaluation_result_code?: EvaluationResultCodeExtension;
    };
  };
};

type ExpiredDrivingLicenceAdvisory = Extract<
  Advisory,
  | Advisory.DRIVING_LICENCE_NOT_EXPIRED
  | Advisory.DRIVING_LICENCE_EXPIRED_WITHIN_GRACE_PERIOD
  | Advisory.DRIVING_LICENCE_EXPIRED_BEYOND_GRACE_PERIOD
>;

export type EvaluationResultCodeExtension =
  | "DOCUMENT_NOT_EXPIRED"
  | "DOCUMENT_EXPIRED_WITHIN_GRACE_PERIOD"
  | "DOCUMENT_EXPIRED_BEYOND_GRACE_PERIOD";

const evaluationResultCodeMapping: Record<
  ExpiredDrivingLicenceAdvisory,
  EvaluationResultCodeExtension
> = {
  [Advisory.DRIVING_LICENCE_NOT_EXPIRED]: "DOCUMENT_NOT_EXPIRED",
  [Advisory.DRIVING_LICENCE_EXPIRED_WITHIN_GRACE_PERIOD]:
    "DOCUMENT_EXPIRED_WITHIN_GRACE_PERIOD",
  [Advisory.DRIVING_LICENCE_EXPIRED_BEYOND_GRACE_PERIOD]:
    "DOCUMENT_EXPIRED_BEYOND_GRACE_PERIOD",
};

export const getVcIssuedEvent = (
  credential: BiometricCredential,
  audit: AuditData,
  session: BiometricSessionFinishedAttributes,
  dvlaDrivingLicenceExpiryGracePeriodInDays: number,
  advisories: Advisory[],
): Result<VcIssuedTxMAEvent, void> => {
  const { contraIndicatorReasons, flaggedRecord, flags, txmaContraIndicators } =
    audit;

  const timestamp_ms = Date.now();
  const timestamp = Math.floor(timestamp_ms / 1000);

  let evaluationResultCode: EvaluationResultCodeExtension | undefined =
    undefined;
  if (dvlaDrivingLicenceExpiryGracePeriodInDays > 0) {
    const evaluationResultCodeResult =
      getEvaluationResultCodeExtensionResult(advisories);
    if (evaluationResultCodeResult.isError) return evaluationResultCodeResult;

    evaluationResultCode = evaluationResultCodeResult.value;
  }

  return successResult({
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
  });
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

const getEvaluationResultCodeExtensionResult = (
  advisories: Advisory[],
): Result<EvaluationResultCodeExtension | undefined, void> => {
  if (advisories.length === 0) return successResult(undefined);

  const expiredDrivingLicenceAdvisories = advisories.filter(
    isExpiredDrivingLicenceAdvisory,
  );

  if (expiredDrivingLicenceAdvisories.length > 1) {
    logger.error(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_MULTIPLE_EXPIRED_DRIVING_LICENCE_ADVISORIES,
      { data: { expiredDrivingLicenceAdvisories } },
    );

    return emptyFailure();
  }

  if (expiredDrivingLicenceAdvisories.length === 0)
    return successResult(undefined);

  const advisory = expiredDrivingLicenceAdvisories[0];
  return successResult(evaluationResultCodeMapping[advisory]);
};

const isExpiredDrivingLicenceAdvisory = (
  advisory: Advisory,
): advisory is ExpiredDrivingLicenceAdvisory => {
  return Object.keys(evaluationResultCodeMapping).includes(advisory);
};
