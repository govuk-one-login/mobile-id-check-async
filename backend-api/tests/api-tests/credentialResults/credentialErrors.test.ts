import { doAsyncJourney, pollForCredentialResults, pollForEvents, Scenario, } from "../utils/apiTestHelpers";
import { randomUUID } from "crypto";
import { mockClientState, mockGovukSigninJourneyId, } from "../utils/apiTestData";

describe("Credential error results", () => {
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
  ])("%s", (_: string, parameters: ErrorResultTestParameters) => {
    let subjectIdentifier: string;
    let criErrorTxmaEvent: object;
    let credentialResult: object;
    let sessionId: string;
    const biometricSessionOverrides = {
      creationDate: parameters.creationDate,
      opaqueId: parameters.opaqueId,
    };

    beforeAll(async () => {
      ({ sessionId, subjectIdentifier } = await doAsyncJourney(
        parameters.scenario,
        biometricSessionOverrides,
      ));

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

interface ErrorResultTestParameters {
  scenario: Scenario;
  opaqueId?: string;
  creationDate?: string;
  expectedError: string;
  expectedErrorDescription: string;
  expectedSuspectedFraudSignal?: string;
}
