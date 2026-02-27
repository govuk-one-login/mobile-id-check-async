import {
  doAsyncJourney,
  EventResponse,
  expectTxmaEventToHaveBeenWritten,
  getIsoStringDate,
  getVcIssuedEventObject,
  getVerifiedJwt,
  pollForEvents,
  Scenario,
} from "../utils/apiTestHelpers";
import { JWTVerifyResult, ResolvedKey } from "jose";
import { expect } from "@jest/globals";

describe("Driving licence failed credential result", () => {
  let subjectIdentifier: string;
  let sessionId: string;
  let biometricSessionId: string;
  let criTxmaEvents: EventResponse[];
  let verifiedJwt: JWTVerifyResult & ResolvedKey;

  describe("Given the vendor returns a driving licence failure with cis biometric session", () => {
    beforeAll(async () => {
      ({ biometricSessionId, sessionId, subjectIdentifier } =
        await doAsyncJourney(Scenario.DRIVING_LICENCE_FAILURE_WITH_CIS));

      verifiedJwt = await getVerifiedJwt(subjectIdentifier);

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
              ci: expect.arrayContaining([expect.any(String)]),
              failedCheckDetails: expect.arrayContaining([
                expect.objectContaining({
                  biometricVerificationProcessLevel: 3,
                  checkMethod: "bvr",
                }),
              ]),
              ciReasons: expect.arrayContaining([expect.any(Object)]),
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

  describe("Expiry grace period", () => {
    describe("Given the vendor checks pass for a DVLA driving licence", () => {
      describe("Given document has expired", () => {
        beforeAll(async () => {
          const now = new Date();
          const oneDayInMillis = 24 * 60 * 60 * 1000;
          const yesterday = getIsoStringDate(
            new Date(now.getTime() - oneDayInMillis),
          );

          ({ biometricSessionId, sessionId, subjectIdentifier } =
            await doAsyncJourney(Scenario.DRIVING_LICENCE_SUCCESS, {
              drivingLicence: {
                issuedBy: "DVLA",
                validUntil: yesterday,
              },
            }));

          verifiedJwt = await getVerifiedJwt(subjectIdentifier);

          criTxmaEvents = await pollForEvents({
            partitionKey: `SESSION#${sessionId}`,
            sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_`,
            numberOfEvents: 4, // CRI_START, CRI_APP_START, CRI_VC_ISSUED, CRI_END
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
              address: [expect.any(Object)],
              drivingPermit: [
                expect.objectContaining({
                  expiryDate: expect.any(String),
                  issuedBy: "DVLA",
                }),
              ],
            },
            extensions: {
              redirect_uri: "https://mockRedirectUri.com",
              evidence: [
                {
                  type: "IdentityCheck",
                  strengthScore: 3,
                  validityScore: 0,
                  activityHistoryScore: 0,
                  ci: expect.arrayContaining([expect.any(String)]),
                  failedCheckDetails: expect.arrayContaining([
                    expect.objectContaining({
                      biometricVerificationProcessLevel: 3,
                      checkMethod: "bvr",
                    }),
                  ]),
                  ciReasons: expect.arrayContaining([expect.any(Object)]),
                  txmaContraIndicators: expect.any(Array),
                  txn: expect.any(String),
                },
              ],
              document_expiry: {
                evaluation_result_code: "DOCUMENT_EXPIRED_BEYOND_GRACE_PERIOD",
              },
            },
          });
        });

        it("Writes DCMAW_ASYNC_CRI_END TxMA event", () => {
          expectTxmaEventToHaveBeenWritten(
            criTxmaEvents,
            "DCMAW_ASYNC_CRI_END",
          );
        });
      });

      // describe("Given document has expired beyond the grace period", () => {
      // })
    });
  });
});
