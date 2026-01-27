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

describe("BRP passed credential result", () => {
  let subjectIdentifier: string;
  let sessionId: string;
  let biometricSessionId: UUID;
  let criTxmaEvents: EventResponse[];
  let verifiedJwt: JWTVerifyResult & ResolvedKey;

  describe("Given the vendor returns a brp success biometric session", () => {
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
        Scenario.BRP_SUCCESS,
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

    it("Writes verified credential with passed evidence to the IPV Core outbound queue", () => {
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
              strengthScore: 4,
              validityScore: 3,
            }),
          ],
        }),
      });
    });

    it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event with valid properties", () => {
      const actualEvent = getVcIssuedEventObject(criTxmaEvents);

      expect(actualEvent).toStrictEqual({
        user: {
          user_id: subjectIdentifier,
          session_id: sessionId,
          govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444",
          transaction_id: biometricSessionId,
        },
        timestamp: expect.any(Number),
        event_timestamp_ms: expect.any(Number),
        event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
        component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`,
        restricted: {
          name: [
            {
              nameParts: expect.any(Array),
            },
          ],
          birthDate: [expect.any(Object)],
          deviceId: [
            {
              value: expect.any(String),
            }
          ],
          residencePermit: [
            {
              documentNumber: expect.any(String),
              expiryDate: expect.any(String),
              icaoIssuerCode: expect.any(String),
              documentType: expect.any(String),
            },
          ],
          flaggedRecord: [
            {
              dateOfExpiry: [
                expect.objectContaining({
                  type: expect.any(String),
                  value: expect.any(String)
                }),
              ],
            },
          ],
        },
        extensions: {
          redirect_uri: "https://mockRedirectUri.com",
          evidence: [
            {
              type: "IdentityCheck",
              txn: expect.any(String),
              strengthScore: 4,
              validityScore: 3,
              checkDetails: expect.arrayContaining([
                expect.objectContaining({
                  biometricVerificationProcessLevel: 3,
                  checkMethod: "bvr",
                }),
              ]),
              txmaContraIndicators: [],
            },
          ],
          dcmawFlagsBRP: { doEInPast: true, doEGreaterThan31Dec2024: true },
        },
      });
    });

    it("Writes DCMAW_ASYNC_CRI_END TxMA event", () => {
      expectTxmaEventToHaveBeenWritten(criTxmaEvents, "DCMAW_ASYNC_CRI_END");
    });
  });
});
