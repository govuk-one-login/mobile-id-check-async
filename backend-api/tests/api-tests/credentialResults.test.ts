import {
  createSessionForSub,
  CredentialResultResponse,
  EventResponse,
  getActiveSessionIdFromSub,
  issueBiometricToken,
  pollForCredentialResults,
  pollForEvents,
} from "./utils/apiTestHelpers";
import { randomUUID } from "crypto";
import {
  READ_ID_MOCK_API_INSTANCE,
  SESSIONS_API_INSTANCE,
} from "./utils/apiInstance";
import {
  createRemoteJWKSet,
  JWTPayload,
  jwtVerify,
  JWTVerifyResult,
  KeyLike,
  ResolvedKey,
} from "jose";

describe("Credential results", () => {
  describe.each([
    [
      "DRIVING_LICENCE_SUCCESS",
      {
        strengthScore: 3,
        validityScore: 0,
      },
    ],
    [
      "PASSPORT_SUCCESS",
      {
        strengthScore: 4,
        validityScore: 3,
      },
    ],
    [
      "BRP_SUCCESS",
      {
        strengthScore: 4,
        validityScore: 3,
      },
    ],
    [
      "BRC_SUCCESS",
      {
        strengthScore: 4,
        validityScore: 3,
      },
    ],
  ])(
    "Given the vendor returns a successful %s session",
    (scenario: string, expectedVcStrengthAndValidityScore: object) => {
      let credentialResultsResponse: CredentialResultResponse[];
      let criEndEventResponse: EventResponse[];
      let subjectIdentifier: string;
      let sessionId: string;
      let vcIssuedEventResponse: EventResponse[];
      let verifiedJwt: JWTVerifyResult<JWTPayload> & ResolvedKey<KeyLike>;

      beforeAll(async () => {
        subjectIdentifier = randomUUID();
        await createSessionForSub(subjectIdentifier);
        sessionId = await getActiveSessionIdFromSub(subjectIdentifier);
        const issueBiometricTokenResponse =
          await issueBiometricToken(sessionId);
        const { opaqueId } = issueBiometricTokenResponse.data;
        const biometricSessionId = randomUUID();

        await READ_ID_MOCK_API_INSTANCE.post(
          `/setupBiometricSessionByScenario/${biometricSessionId}`,
          JSON.stringify({
            scenario,
            overrides: {
              opaqueId,
              creationDate: new Date().toISOString(),
            },
          }),
        );

        await SESSIONS_API_INSTANCE.post("/async/finishBiometricSession", {
          sessionId,
          biometricSessionId,
        });

        credentialResultsResponse = await pollForCredentialResults(
          `SUB#${subjectIdentifier}`,
          1,
        );

        const credentialResult = credentialResultsResponse[0].body as Record<
          string,
          unknown
        >;
        const credentialJwtArray = credentialResult[
          "https://vocab.account.gov.uk/v1/credentialJWT"
        ] as string[];
        const credentialJwt = credentialJwtArray[0];

        const JWKS = createRemoteJWKSet(
          new URL(`${process.env.SESSIONS_API_URL}/.well-known/jwks.json`),
        );

        verifiedJwt = await jwtVerify(credentialJwt, JWKS, {
          algorithms: ["ES256"],
        });

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

      it("Writes verified credential to the IPV Core outbound queue", () => {
        const { protectedHeader, payload } = verifiedJwt;

        expect(protectedHeader).toEqual({
          alg: "ES256",
          kid: "b169df69-8ec7-4667-a674-4b5e7bc66886",
          typ: "JWT",
        });

        expect(payload).toEqual({
          iat: expect.any(Number),
          iss: "https://review-b-async.dev.account.gov.uk",
          jti: expect.stringContaining("urn:uuid:"),
          nbf: expect.any(Number),
          sub: subjectIdentifier,
          vc: expect.objectContaining({
            evidence: [
              expect.objectContaining(expectedVcStrengthAndValidityScore),
            ],
          }),
        });
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
    },
  );
});
