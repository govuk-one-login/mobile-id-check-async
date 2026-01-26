import {
  createSessionForSub,
  EventResponse,
  finishBiometricSession,
  getActiveSessionIdFromSub,
  getCredentialFromIpvOutboundQueue,
  issueBiometricToken,
  pollForCredentialResults,
  pollForEvents,
  Scenario,
  setupBiometricSessionByScenario,
} from "../utils/apiTestHelpers";
import { randomUUID } from "crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
  JWTVerifyResult,
  ResolvedKey,
} from "jose";
import {
  FailEvidence,
  PassEvidence,
} from "@govuk-one-login/mobile-id-check-biometric-credential";
import { mockClientState, mockGovukSigninJourneyId } from "../utils/apiTestData";

describe("Successful credential results", () => {
  describe.each([
    [
      Scenario.PASSPORT_SUCCESS,
      {
        expectedStrengthScore: 4,
        expectedValidityScore: 3,
      },
    ],
    [
      Scenario.PASSPORT_FAILURE_WITH_CIS,
      {
        expectedStrengthScore: 4,
        expectedValidityScore: 0,
      },
    ],
    [
      Scenario.BRP_SUCCESS,
      {
        expectedStrengthScore: 4,
        expectedValidityScore: 3,
      },
    ],
    [
      Scenario.BRC_SUCCESS,
      {
        expectedStrengthScore: 4,
        expectedValidityScore: 3,
      },
    ],
  ])(
    "Given the vendor returns a %s biometric session",
    (scenario: Scenario, parameters: SuccessfulResultTestParameters) => {
      let subjectIdentifier: string;
      let criTxmaEvents: EventResponse[];
      let verifiedJwt: JWTVerifyResult & ResolvedKey;

      beforeAll(async () => {
        subjectIdentifier = randomUUID();
        await createSessionForSub(subjectIdentifier);

        const sessionId = await getActiveSessionIdFromSub(subjectIdentifier);

        const issueBiometricTokenResponse =
          await issueBiometricToken(sessionId);

        const { opaqueId } = issueBiometricTokenResponse.data;
        const biometricSessionId = randomUUID();
        const creationDate = new Date().toISOString();
        await setupBiometricSessionByScenario(
          biometricSessionId,
          scenario,
          opaqueId,
          creationDate,
        );

        await finishBiometricSession(sessionId, biometricSessionId);

        const credentialJwt =
          await getCredentialFromIpvOutboundQueue(subjectIdentifier);

        const jwks = createRemoteJWKSet(
          new URL(`${process.env.SESSIONS_API_URL}/.well-known/jwks.json`),
        );

        verifiedJwt = await jwtVerify(credentialJwt, jwks, {
          algorithms: ["ES256"],
        });

        criTxmaEvents = await pollForEvents({
          partitionKey: `SESSION#${sessionId}`,
          sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_`,
          numberOfEvents: 4, // Should find CRI_APP_START, CRI_START, CRI_END and CRI_VC_ISSUED
        });

      }, 60000);

      it("Writes verified credential to the IPV Core outbound queue", () => {
        const { protectedHeader, payload } = verifiedJwt;

        expect(protectedHeader).toEqual({
          alg: "ES256",
          kid: expect.any(String),
          typ: "JWT",
        });

        const expectedEvidence: Partial<PassEvidence | FailEvidence> = {
          strengthScore: parameters.expectedStrengthScore,
          validityScore: parameters.expectedValidityScore,
        };

        if (parameters.expectedActivityHistoryScore) {
          expectedEvidence.activityHistoryScore =
            parameters.expectedActivityHistoryScore;
        }

        expect(payload).toEqual({
          iat: expect.any(Number),
          iss: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`,
          jti: expect.stringContaining("urn:uuid:"),
          nbf: expect.any(Number),
          sub: subjectIdentifier,
          vc: expect.objectContaining({
            evidence: [expect.objectContaining(expectedEvidence)],
          }),
        });
      });

      it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event", () => {
        expectTxmaEventToHaveBeenWritten(
          criTxmaEvents,
          "DCMAW_ASYNC_CRI_VC_ISSUED",
        );
      });

      it("Writes DCMAW_ASYNC_CRI_END TxMA event", () => {
        expectTxmaEventToHaveBeenWritten(criTxmaEvents, "DCMAW_ASYNC_CRI_END");
      });
    },
  );
});

describe("Unsuccessful credential results", () => {
  describe.each([
    [
      "Given the vendor returns an invalid biometric session",
      {
        scenario: Scenario.INVALID_BIOMETRIC_SESSION,
        expectedError: "server_error",
        expectedErrorDescription: "Internal server error",
      },
    ],
    [
      "Given the opaque ID in the biometric session does not match the opaque ID in the user session",
      {
        scenario: Scenario.PASSPORT_SUCCESS,
        opaqueId: randomUUID(),
        expectedError: "access_denied",
        expectedErrorDescription: "Suspected fraud detected",
        expectedSuspectedFraudSignal: "BIOMETRIC_SESSION_OPAQUEID_MISMATCH",
      },
    ],
    [
      "Given the biometric session was created before the user session",
      {
        scenario: Scenario.PASSPORT_SUCCESS,
        creationDate: "2022-06-10T07:35:48.431Z",
        expectedError: "access_denied",
        expectedErrorDescription: "Suspected fraud detected",
        expectedSuspectedFraudSignal:
          "BIOMETRIC_SESSION_OLDER_THAN_AUTH_SESSION",
      },
    ],
  ])("%s", (_: string, parameters: UnsuccessfulResultTestParameters) => {
    let subjectIdentifier: string;
    let criErrorTxmaEvent: object;
    let credentialResult: object;

    beforeAll(async () => {
      subjectIdentifier = randomUUID();
      await createSessionForSub(subjectIdentifier);

      const sessionId = await getActiveSessionIdFromSub(subjectIdentifier);

      const issueBiometricTokenResponse = await issueBiometricToken(sessionId);

      const biometricSessionId = randomUUID();
      const opaqueIdFromSession: string =
        issueBiometricTokenResponse.data.opaqueId;
      const opaqueId = parameters.opaqueId ?? opaqueIdFromSession;
      const creationDate = parameters.creationDate ?? new Date().toISOString();
      await setupBiometricSessionByScenario(
        biometricSessionId,
        parameters.scenario,
        opaqueId,
        creationDate,
      );

      await finishBiometricSession(sessionId, biometricSessionId);

      const credentialResultsResponse = await pollForCredentialResults(
        `SUB#${subjectIdentifier}`,
        1,
      );
      credentialResult = credentialResultsResponse[0].body;

      const criErrorEventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_ERROR`,
        numberOfEvents: 1,
      });
      criErrorTxmaEvent = criErrorEventsResponse[0].event;
    }, 60000);

    it("Writes error to the IPV Core outbound queue", () => {
      expect(credentialResult).toEqual({
        sub: subjectIdentifier,
        state: mockClientState,
        govuk_signin_journey_id: mockGovukSigninJourneyId,
        error: parameters.expectedError,
        error_description: parameters.expectedErrorDescription,
      });
    });

    it("Writes DCMAW_ASYNC_CRI_ERROR TxMA event", () => {
      type GenericEvent = {
        event_name: string;
        extensions?: {
          suspected_fraud_signal?: string;
        };
      };
      const event = criErrorTxmaEvent as GenericEvent;
      expect(event.event_name).toEqual("DCMAW_ASYNC_CRI_ERROR");
      if (parameters.expectedSuspectedFraudSignal) {
        expect(event.extensions?.suspected_fraud_signal).toEqual(
          parameters.expectedSuspectedFraudSignal,
        );
      }
    });
  });
});

interface SuccessfulResultTestParameters {
  expectedStrengthScore: number;
  expectedValidityScore: number;
  expectedActivityHistoryScore?: number;
}

interface UnsuccessfulResultTestParameters {
  scenario: Scenario;
  opaqueId?: string;
  creationDate?: string;
  expectedError: string;
  expectedErrorDescription: string;
  expectedSuspectedFraudSignal?: string;
}

function expectTxmaEventToHaveBeenWritten(
  txmaEvents: EventResponse[],
  eventName: string,
) {
  expect(
    txmaEvents.some((item) => {
      return "event_name" in item.event && item.event.event_name === eventName;
    }),
  ).toBe(true);
}
