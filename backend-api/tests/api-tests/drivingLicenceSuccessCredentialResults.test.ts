import {
  createSessionForSub,
  EventResponse,
  finishBiometricSession,
  getActiveSessionIdFromSub,
  getCredentialFromIpvOutboundQueue,
  issueBiometricToken,
  pollForEvents,
  Scenario,
  setupBiometricSessionByScenario,
} from "./utils/apiTestHelpers";
import { randomUUID } from "crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
  JWTVerifyResult,
  ResolvedKey,
} from "jose";

describe("Driving licence credential results", () => {
  describe("Given the vendor returns a successful biometric session", () => {
    let subjectIdentifier: string;
    let sessionId: string;
    let criTxmaEvents: EventResponse[];
    let verifiedJwt: JWTVerifyResult & ResolvedKey;
    const scenario = Scenario.DRIVING_LICENCE_SUCCESS;
    const expectedEvidence = {
      strengthScore: 3,
      validityScore: 2,
      activityHistoryScore: 1,
    }

    beforeAll(async () => {
      subjectIdentifier = randomUUID();
      await createSessionForSub(subjectIdentifier);

      sessionId = await getActiveSessionIdFromSub(subjectIdentifier);

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

      const credentialJwtFromQueue =
        await getCredentialFromIpvOutboundQueue(subjectIdentifier);

      const jwks = createRemoteJWKSet(
        new URL(`${process.env.SESSIONS_API_URL}/.well-known/jwks.json`),
      );

      verifiedJwt = await jwtVerify(credentialJwtFromQueue, jwks, {
        algorithms: ["ES256"],
      });

      criTxmaEvents = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_`,
        numberOfEvents: 4, // Should find CRI_APP_START, CRI_START, CRI_END and CRI_VC_ISSUED
      });

      console.log(JSON.stringify(criTxmaEvents));
    }, 60000);

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

    it("Writes verified credential to the IPV Core outbound queue", () => {
      const { protectedHeader, payload } = verifiedJwt;

      expect(protectedHeader).toEqual({
        alg: "ES256",
        kid: expect.any(String),
        typ: "JWT",
      });

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

    it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event with valid properties", () => {
      const actualEvent = getVcIssuedEventObject();
      const expectedEvent = getExpectedEventDrivingLicenceSuccess(subjectIdentifier, sessionId);

      expect(actualEvent).toMatchObject(expectedEvent);

      function getVcIssuedEventObject(): object {
        const eventResponse = criTxmaEvents.find(item =>
          item.event &&
          'event_name' in item.event &&
          item.event.event_name === "DCMAW_ASYNC_CRI_VC_ISSUED"
        );
        if (!eventResponse) {
          throw Error("VC ISSUED event not found.");
        }
        return eventResponse.event;
      }
    });

    it("Writes DCMAW_ASYNC_CRI_END TxMA event", () => {
      expectTxmaEventToHaveBeenWritten(criTxmaEvents, "DCMAW_ASYNC_CRI_END");
    });
  })
})

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getExpectedEventDrivingLicenceSuccess = (user: string, session: string) => ({
  user: {
    user_id: user,
    session_id: session,
    govuk_signin_journey_id: expect.stringMatching(uuidRegex),
  },
  event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
  component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`, // yes
  restricted: {
    name: [
      {
        nameParts: expect.any(Array)
      },
    ],
    birthDate: expect.arrayContaining([
      expect.any(Object)
    ]),
    drivingPermit: expect.arrayContaining([
      expect.objectContaining(
        {
          expiryDate: expect.any(String),
          issuedBy: "DVLA",
        }),
    ]),
    address: expect.arrayContaining([
      expect.any(Object)
    ]),
  },
  extensions: {
    redirect_uri: "https://mockRedirectUri.com",
    evidence: [
      {
        type: "IdentityCheck",
        strengthScore: 3,
        validityScore: 2,
        activityHistoryScore: 1,
        checkDetails: expect.arrayContaining([
          expect.objectContaining(
            { biometricVerificationProcessLevel: 3, checkMethod: "bvr" },
          )
        ]),
      },
    ],
    // reminder, to be removed: new field docExpiry will go here
  },
});