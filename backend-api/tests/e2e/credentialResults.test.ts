import {
  createSessionForSub,
  EventResponse,
  getActiveSessionIdFromSub,
  issueBiometricToken,
  pollForEvents,
} from "../api-tests/utils/apiTestHelpers";
import { randomUUID } from "crypto";
import {
  READ_ID_MOCK_API_INSTANCE,
  SESSIONS_API_INSTANCE,
} from "../api-tests/utils/apiInstance";

describe("Credential results", () => {
  describe("Given the vendor returns a successful driving licence session", () => {
    let sessionId: string;
    let vcIssuedEventResponse: EventResponse[];
    let criEndEventResponse: EventResponse[];
    beforeAll(async () => {
      const sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);
      const issueBiometricTokenResponse = await issueBiometricToken(sessionId);
      const { opaqueId } = issueBiometricTokenResponse.data;
      const biometricSessionId = randomUUID();

      const setupResponse = await READ_ID_MOCK_API_INSTANCE.post(
        `/setupBiometricSessionByScenario/${biometricSessionId}`,
        JSON.stringify({
          scenario: "DRIVING_LICENCE_SUCCESS",
          overrides: {
            opaqueId,
            creationDate: new Date().toISOString(),
          },
        }),
      );
      console.log("setupResponse.data", setupResponse.data);

      await SESSIONS_API_INSTANCE.post("/async/finishBiometricSession", {
        sessionId,
        biometricSessionId,
      });

      // Assume you can get both events with one call, haven't looked into it yet
      vcIssuedEventResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_VC_ISSUED`,
        numberOfEvents: 1,
      });

      criEndEventResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_END`,
        numberOfEvents: 1,
      });
    }, 20000);

    it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event", () => {
      expect(vcIssuedEventResponse[0].event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
        }),
      );
    });

    it("Writes DCMAW_ASYNC_CRI_END TxMA event", () => {
      expect(criEndEventResponse[0].event).toEqual(
        expect.objectContaining({
          event_name: "DCMAW_ASYNC_CRI_END",
        }),
      );
    });
  });
});
