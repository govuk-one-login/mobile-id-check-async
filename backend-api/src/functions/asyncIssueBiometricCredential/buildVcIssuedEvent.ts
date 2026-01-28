import { CredentialSubject, FailEvidence, FlaggedRecord, PassEvidence, TxmaContraIndicator } from "@govuk-one-login/mobile-id-check-biometric-credential";

type VcEvidence =
  (PassEvidence | FailEvidence) &
  {
    txmaContraIndicators: string[],
    ciReasons?: string[],
    dcmawFlagsPassport?: Record<string, unknown>
    dcmawFlagsDL?: Record<string, unknown>
    dcmawFlagsBRP?: Record<string, unknown>
  }

type VcIssuedTxMAEvent = {
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
  user: {
    user_id: string,
    session_id: string,
    govuk_signin_journey_id: string,
    transaction_id: string
  },
  timestamp: number,
  event_timestamp_ms: number,
  component_id: string,
  restricted: CredentialSubject & {
    flaggedRecord?: FlaggedRecord[]
  },
  extensions: {
    redirect_uri?: string,
    evidence: VcEvidence[]
  },
};

export const getVcIssuedEvent = (userId: string, sessionId: string, journeyId: string, transactionId: string): VcIssuedTxMAEvent => {
  return {
    user: {
      user_id: userId,
      session_id
        :
        sessionId,
      govuk_signin_journey_id
        :
        journeyId,
      transaction_id
        :
        transactionId,
    }
  }
}