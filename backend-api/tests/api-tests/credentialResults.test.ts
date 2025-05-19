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

describe("Credential results", () => {
  describe.each([
    [
      Scenario.DRIVING_LICENCE_SUCCESS,
      {
        expectedStrengthScore: 3,
        expectedValidityScore: 0,
      },
    ],
    [
      Scenario.PASSPORT_SUCCESS,
      {
        expectedStrengthScore: 4,
        expectedValidityScore: 3,
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
    "Given the vendor returns a successful %s session",
    (scenario: Scenario, parameters: TestParameters) => {
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
          numberOfEvents: 3, // Should find CRI_START, CRI_END and CRI_VC_ISSUED
        });
      }, 40000);

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
            evidence: [
              expect.objectContaining({
                strengthScore: parameters.expectedStrengthScore,
                validityScore: parameters.expectedValidityScore,
              }),
            ],
          }),
        });
      });

      it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event", () => {
        expect(criTxmaEvents).toContain({
          event: expect.objectContaining({
            event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
          }),
        });
      });

      it("Writes DCMAW_ASYNC_CRI_END TxMA event", () => {
        expect(criTxmaEvents).toContain({
          event: expect.objectContaining({
            event_name: "DCMAW_ASYNC_CRI_END",
          }),
        });
      });
    },
  );
});

interface TestParameters {
  expectedStrengthScore: number;
  expectedValidityScore: number;
}
