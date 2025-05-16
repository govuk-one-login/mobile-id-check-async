import {
  createSessionForSub,
  CredentialResultResponse,
  EventResponse,
  getActiveSessionIdFromSub,
  issueBiometricToken,
  pollForCredentialResults,
  pollForEvents,
} from "../api-tests/utils/apiTestHelpers";
import { randomUUID } from "crypto";
import {
  READ_ID_MOCK_API_INSTANCE,
  SESSIONS_API_INSTANCE,
} from "../api-tests/utils/apiInstance";
import { mockClientState } from "../api-tests/utils/apiTestData";
import { base64url } from "jose";

describe("Credential results", () => {
  describe("Given the vendor returns a successful driving licence session", () => {
    let subjectIdentifier: string;
    let sessionId: string;
    let credentialResultsResponse: CredentialResultResponse[];
    let vcIssuedEventResponse: EventResponse[];
    let criEndEventResponse: EventResponse[];
    beforeAll(async () => {
      subjectIdentifier = randomUUID();
      await createSessionForSub(subjectIdentifier);
      sessionId = await getActiveSessionIdFromSub(subjectIdentifier);
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

      credentialResultsResponse = await pollForCredentialResults(
        `SUB#${subjectIdentifier}`,
        1,
      );

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
    }, 40000);

    it("Writes verified credential to the IPV Core outbound queue - WIP", () => {
      const credentialResult = credentialResultsResponse[0].body as Record<
        string,
        unknown
      >;
      const credentialJwtArray = credentialResult[
        "https://vocab.account.gov.uk/v1/credentialJWT"
      ] as string[];
      const credentialJwt = credentialJwtArray[0];

      const [encodedHeader, encodedPayload, signature] =
        credentialJwt.split(".");

      console.log("signature", signature);

      const decoder = new TextDecoder("utf-8");

      const credentialJwtHeader = decoder.decode(
        base64url.decode(encodedHeader),
      );
      const credentialJwtPayload = decoder.decode(
        base64url.decode(encodedPayload),
      );

      console.log("header", credentialJwtHeader);
      console.log("payload", credentialJwtPayload);

      console.log(credentialJwt);

      expect(credentialResult.state).toEqual(mockClientState);
      expect(credentialResult.sub).toEqual(subjectIdentifier);

      expect(credentialJwtHeader).toEqual(
        JSON.stringify({
          alg: "ES256",
          kid: "b169df69-8ec7-4667-a674-4b5e7bc66886",
          typ: "JWT",
        }),
      );
    });

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
