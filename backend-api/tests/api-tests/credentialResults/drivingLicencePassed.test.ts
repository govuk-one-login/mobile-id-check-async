import {
  doAsyncJourney,
  EventResponse,
  expectTxmaEventToHaveBeenWritten,
  getVcIssuedEventObject,
  getVerifiedJwt,
  pollForEvents,
  Scenario,
} from "../utils/apiTestHelpers";
import { UUID } from "crypto";
import { JWTVerifyResult, ResolvedKey } from "jose";
import { expect } from "@jest/globals";

describe("Driving licence passed credential result", () => {
  let subjectIdentifier: string;
  let sessionId: string;
  let biometricSessionId: UUID;
  let criTxmaEvents: EventResponse[];
  let verifiedJwt: JWTVerifyResult & ResolvedKey;

  describe("Given the vendor returns a driving licence success biometric session", () => {
    beforeAll(async () => {
      ({ subjectIdentifier, sessionId, biometricSessionId } =
        await doAsyncJourney(Scenario.DRIVING_LICENCE_SUCCESS));

      verifiedJwt = await getVerifiedJwt(subjectIdentifier);

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
              strengthScore: 3,
              validityScore: 2,
              activityHistoryScore: 1,
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
          govuk_signin_journey_id: "44444444-4444-4444-4444-444444444444",
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
          birthDate: [expect.any(Object)],
          deviceId: [
            {
              value: expect.any(String),
            },
          ],
          drivingPermit: [
            expect.objectContaining({
              expiryDate: expect.any(String),
              issuedBy: "DVLA",
            }),
          ],
          address: [expect.any(Object)],
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
                expect.objectContaining({
                  biometricVerificationProcessLevel: 3,
                  checkMethod: "bvr",
                }),
              ]),
              txmaContraIndicators: [],
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
