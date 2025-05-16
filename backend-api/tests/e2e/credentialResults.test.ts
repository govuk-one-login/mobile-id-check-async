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
import {
  createRemoteJWKSet,
  JWTPayload,
  jwtVerify,
  JWTVerifyResult,
  KeyLike,
  ResolvedKey,
} from "jose";

describe("Credential results", () => {
  describe("Given the vendor returns a successful driving licence session", () => {
    let subjectIdentifier: string;
    let sessionId: string;
    let credentialResultsResponse: CredentialResultResponse[];
    let vcIssuedEventResponse: EventResponse[];
    let criEndEventResponse: EventResponse[];
    let verifiedJwt: JWTVerifyResult<JWTPayload> & ResolvedKey<KeyLike>;
    beforeAll(async () => {
      subjectIdentifier = randomUUID();
      await createSessionForSub(subjectIdentifier);
      sessionId = await getActiveSessionIdFromSub(subjectIdentifier);
      const issueBiometricTokenResponse = await issueBiometricToken(sessionId);
      const { opaqueId } = issueBiometricTokenResponse.data;
      const biometricSessionId = randomUUID();

      await READ_ID_MOCK_API_INSTANCE.post(
        `/setupBiometricSessionByScenario/${biometricSessionId}`,
        JSON.stringify({
          scenario: "DRIVING_LICENCE_SUCCESS",
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

      // This validates the signature - unsure no assertion directly on sig
      verifiedJwt = await jwtVerify(credentialJwt, JWKS, {
        algorithms: ["ES256"],
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
    }, 40000);

    it("Writes verified credential to the IPV Core outbound queue - WIP", () => {
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
        vc: {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://vocab.account.gov.uk/contexts/identity-v1.jsonld",
          ],
          type: ["VerifiableCredential", "IdentityCheckCredential"],
          credentialSubject: {
            name: [
              {
                nameParts: [
                  { type: "GivenName", value: "Joe" },
                  { type: "GivenName", value: "Shmoe" },
                  { type: "FamilyName", value: "Doe The Ball" },
                ],
              },
            ],
            birthDate: [{ value: "1985-02-08" }],
            deviceId: [{ value: "fb03ce33-6cb4-4b27-b428-f614eba26dd0" }],
            drivingPermit: [
              {
                personalNumber: "DOE99802085J99FG",
                expiryDate: "2023-01-18",
                issueDate: "2022-05-29",
                issueNumber: null,
                issuedBy: "DVLA",
                fullAddress: "WHATEVER STREET, WIRRAL, CH1 1AQ",
              },
            ],
            address: [
              {
                uprn: null,
                organisationName: null,
                subBuildingName: null,
                buildingNumber: null,
                buildingName: null,
                dependentStreetName: null,
                streetName: null,
                doubleDependentAddressLocality: null,
                dependentAddressLocality: null,
                addressLocality: null,
                postalCode: "CH1 1AQ",
                addressCountry: null,
              },
            ],
          },
          evidence: [
            {
              type: "IdentityCheck",
              txn: "9930669c-c6c6-434b-b551-75fc5f081bcd",
              strengthScore: 3,
              validityScore: 0,
              activityHistoryScore: 0,
              ci: [],
              failedCheckDetails: [
                {
                  checkMethod: "vri",
                  identityCheckPolicy: "published",
                  activityFrom: "2022-05-29",
                },
                { checkMethod: "bvr", biometricVerificationProcessLevel: 3 },
              ],
            },
          ],
        },
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
  });
});
