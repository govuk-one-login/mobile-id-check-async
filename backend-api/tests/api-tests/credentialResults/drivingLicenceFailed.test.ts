import {
  createSessionForSub,
  EventResponse,
  expectTxmaEventToHaveBeenWritten,
  finishBiometricSession,
  getActiveSessionIdFromSub,
  getCredentialFromIpvOutboundQueue,
  getVcIssuedEventObject,
  issueBiometricToken,
  pollForEvents,
  Scenario,
  setupBiometricSessionByScenario,
} from "../utils/apiTestHelpers";
import { randomUUID, UUID } from "crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
  JWTVerifyResult,
  ResolvedKey,
} from "jose";
import { expect } from "@jest/globals";

describe("Driving licence credential results", () => {
  let subjectIdentifier: string;
  let sessionId: string;
  let biometricSessionId: UUID;
  let criTxmaEvents: EventResponse[];
  let verifiedJwt: JWTVerifyResult & ResolvedKey;

  describe("Given the vendor returns a driving licence failure with cis biometric session", () => {
    beforeAll(async () => {
      subjectIdentifier = randomUUID();
      await createSessionForSub(subjectIdentifier);

      sessionId = await getActiveSessionIdFromSub(subjectIdentifier);
      const issueBiometricTokenResponse = await issueBiometricToken(sessionId);

      const { opaqueId } = issueBiometricTokenResponse.data;
      biometricSessionId = randomUUID();
      const creationDate = new Date().toISOString();

      await setupBiometricSessionByScenario(
        biometricSessionId,
        Scenario.DRIVING_LICENCE_FAILURE_WITH_CIS,
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
    }, 60000);

    it("Writes verified credential with failed evidence to the IPV Core outbound queue", () => {
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
          evidence: [
            expect.objectContaining({
              strengthScore: 3,
              validityScore: 0,
              activityHistoryScore: 0,
            }),
          ],
        }),
      });
    });

    it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event with valid properties", () => {
      const actualEvent = getVcIssuedEventObject(criTxmaEvents);

      expect(actualEvent).toStrictEqual({
        timestamp: expect.any(Number),
        user: {
          user_id: subjectIdentifier,
          session_id: sessionId,
          govuk_signin_journey_id: expect.any(String),
          transaction_id: biometricSessionId,
        },
        event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
        event_timestamp_ms: expect.any(Number),
        component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`,
        restricted: {
          name: [
            {
              nameParts: expect.any(Array),
            },
          ],
          birthDate: [],
          deviceId: [
            {
              value: expect.any(String),
            },
          ],
          address: [expect.any(Object)],
        },
        extensions: {
          redirect_uri: "https://mockRedirectUri.com",
          evidence: [
            {
              type: "IdentityCheck",
              strengthScore: 3,
              validityScore: 0,
              activityHistoryScore: 0,
              ci: expect.any(Array),
              failedCheckDetails: [
                expect.objectContaining({
                  biometricVerificationProcessLevel: 3,
                  checkMethod: "bvr",
                }),
              ],
              ciReasons: [expect.any(Object)],
              txmaContraIndicators: expect.any(Array),
              txn: expect.any(String),
            },
          ],
        },
      });
    });

    it("Writes DCMAW_ASYNC_CRI_END TxMA event", () => {
      expectTxmaEventToHaveBeenWritten(criTxmaEvents, "DCMAW_ASYNC_CRI_END");
    });
  });
});
