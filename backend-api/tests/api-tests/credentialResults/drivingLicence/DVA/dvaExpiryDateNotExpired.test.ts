import { beforeAll, expect, it } from "@jest/globals";
import { JWTVerifyResult, ResolvedKey } from "jose";
import { getIsoStringDateNDaysFromToday } from "../../../utils/apiTestData";
import {
  EventResponse,
  Scenario,
  doAsyncJourney,
  expectTxmaEventToHaveBeenWritten,
  getVcIssuedEventObject,
  getVerifiedJwt,
  pollForEvents,
} from "../../../utils/apiTestHelpers";

describe("Given DVA document has not expired", () => {
  let subjectIdentifier: string;
  let sessionId: string;
  let biometricSessionId: string;
  let criTxmaEvents: EventResponse[];
  let verifiedJwt: JWTVerifyResult & ResolvedKey;
  let expiryDate: string;

  beforeAll(() => {
    expiryDate = getIsoStringDateNDaysFromToday(0);
  });

  describe("Given vendor checks fail", () => {
    beforeAll(async () => {
      ({ biometricSessionId, sessionId, subjectIdentifier } =
        await doAsyncJourney(Scenario.DRIVING_LICENCE_FAILURE_WITH_CIS, {
          drivingLicence: {
            issuedBy: "DVA",
            validUntil: expiryDate,
          },
        }));

      verifiedJwt = await getVerifiedJwt(subjectIdentifier);

      criTxmaEvents = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_`,
        numberOfEvents: 4, // CRI_START, CRI_APP_START, CRI_VC_ISSUED, CRI_END
      });
    }, 60000);

    it("Writes verified credential with fail evidence to the IPV Core outbound queue", () => {
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

    it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event", () => {
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
              ciReasons: expect.arrayContaining([expect.any(Object)]),
              failedCheckDetails: expect.arrayContaining([
                expect.objectContaining({
                  biometricVerificationProcessLevel: 3,
                  checkMethod: "bvr",
                }),
              ]),
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

  describe("Given vendor checks pass", () => {
    beforeAll(async () => {
      ({ biometricSessionId, sessionId, subjectIdentifier } =
        await doAsyncJourney(Scenario.DRIVING_LICENCE_SUCCESS, {
          drivingLicence: {
            issuedBy: "DVA",
            validUntil: expiryDate,
          },
        }));

      verifiedJwt = await getVerifiedJwt(subjectIdentifier);

      criTxmaEvents = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_`,
        numberOfEvents: 4, // CRI_START, CRI_APP_START, CRI_VC_ISSUED, CRI_END
      });
    }, 60000);

    it("Writes verified credential with pass evidence to the IPV Core outbound queue", () => {
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
          credentialSubject: expect.objectContaining({
            drivingPermit: [
              expect.objectContaining({
                expiryDate,
                issuedBy: "DVA",
              }),
            ],
          }),
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

    it("Writes DCMAW_ASYNC_CRI_VC_ISSUED TxMA event", () => {
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
              expiryDate,
              issuedBy: "DVA",
            }),
          ],
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
