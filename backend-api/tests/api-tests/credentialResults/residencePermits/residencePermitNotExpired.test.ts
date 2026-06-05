import { beforeAll, describe, expect, it } from "vitest";
import { JWTVerifyResult, ResolvedKey } from "jose";
import {
  EventResponse,
  doAsyncJourney,
  getVerifiedJwt,
  pollForEvents,
  getVcIssuedEventObject,
} from "../../utils/apiTestHelpers";
import { getDateNMonthsAndDaysFromToday } from "../../utils/apiTestData";
import { residencePermitTestScenarios } from "./residencePermitTestSetup";

// this isn't a valid test scenario as the latest expiry date for residence permits is 31-Dec-2024
// this test documents our system behaviour if an 'in-date' document is used

describe.each(residencePermitTestScenarios)(
  "$documentType",
  (residencePermitTestScenario) => {
    let expiryDates: {
      ddMMyyyyDotFormat: string;
      yyyyMMddDashFormat: string;
    };
    beforeAll(() => {
      expiryDates = getDateNMonthsAndDaysFromToday(0);
    });

    describe("Given vendor checks are successful", () => {
      let subjectIdentifier: string;
      let sessionId: string;
      let biometricSessionId: string;
      let criTxmaEvents: EventResponse[];
      let verifiedJwt: JWTVerifyResult & ResolvedKey;

      beforeAll(async () => {
        ({ biometricSessionId, sessionId, subjectIdentifier } =
          await doAsyncJourney(residencePermitTestScenario.scenario.success, {
            residencePermit: {
              interpretedDateOfExpiry: expiryDates.ddMMyyyyDotFormat,
            },
          }));

        verifiedJwt = await getVerifiedJwt(subjectIdentifier);

        criTxmaEvents = await pollForEvents({
          partitionKey: `SESSION#${sessionId}`,
          sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_`,
          numberOfEvents: 4, // Should find CRI_APP_START, CRI_START, CRI_END and CRI_VC_ISSUED
        });
      }, 60000);

      it("Writes verified credential with passing evidence to the IPV Core outbound queue", () => {
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
            govuk_signin_journey_id: expect.any(String),
            transaction_id: biometricSessionId,
          },
          event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
          timestamp: expect.any(Number),
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
            residencePermit: [
              {
                documentNumber: expect.any(String),
                expiryDate: expiryDates.yyyyMMddDashFormat,
                icaoIssuerCode: "GBR",
                documentType: residencePermitTestScenario.documentCode,
              },
            ],
            flaggedRecord: [
              {
                dateOfExpiry: expect.arrayContaining([
                  {
                    type: "DcmawDateOfExpiry",
                    value: expiryDates.yyyyMMddDashFormat,
                  },
                  {
                    type: "InterpretedDateOfExpiry",
                    value: expiryDates.ddMMyyyyDotFormat,
                  },
                ]),
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
                  {
                    checkMethod: "vcrypt",
                    identityCheckPolicy: "published",
                    activityFrom: null,
                  },
                  {
                    checkMethod: "bvr",
                    biometricVerificationProcessLevel: 3,
                  },
                ]),
                txmaContraIndicators: [],
              },
            ],
            dcmawFlagsBRP: {
              doEMismatched: true,
              doEGreaterThan31Dec2024: true,
            },
          },
        });
      });
    });

    describe("Given vendor checks fail", () => {
      let subjectIdentifier: string;
      let sessionId: string;
      let biometricSessionId: string;
      let criTxmaEvents: EventResponse[];
      let verifiedJwt: JWTVerifyResult & ResolvedKey;

      beforeAll(async () => {
        ({ biometricSessionId, sessionId, subjectIdentifier } =
          await doAsyncJourney(residencePermitTestScenario.scenario.failure, {
            residencePermit: {
              interpretedDateOfExpiry: expiryDates.ddMMyyyyDotFormat,
            },
          }));

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
                strengthScore: 4,
                validityScore: 0,
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
            govuk_signin_journey_id: expect.any(String),
            transaction_id: biometricSessionId,
          },
          event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
          timestamp: expect.any(Number),
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
            residencePermit: [
              {
                documentNumber: expect.any(String),
                expiryDate: expiryDates.yyyyMMddDashFormat,
                icaoIssuerCode: "GBR",
                documentType: residencePermitTestScenario.documentCode,
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
                validityScore: 0,
                failedCheckDetails: expect.arrayContaining([
                  {
                    checkMethod: "vcrypt",
                    identityCheckPolicy: "published",
                    activityFrom: null,
                  },
                  {
                    checkMethod: "bvr",
                    biometricVerificationProcessLevel: 3,
                  },
                ]),
                ci: [],
                ciReasons: [],
                txmaContraIndicators: [],
              },
            ],
          },
        });
      });
    });
  },
);
