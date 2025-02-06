import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { getBaseSessionAttributes } from "./sessionAttributes";
import { emptyFailure, successResult } from "../../../../utils/result";

describe("Session attributes", () => {
  describe("getBaseSessionAttributes", () => {
    describe("Given an invalid base session attribute record", () => {
      describe.each([
        {
          scenario: "Given attributes is undefined",
          attributes: undefined,
        },
        {
          scenario: "Given attributes is an empty object",
          attributes: {},
        },
        {
          scenario: "Given clientId is missing",
          attributes: marshall({
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given govukSigninJourneyId is missing",
          attributes: marshall({
            clientId: "mockClientId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given createdAt is missing",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given issuer is missing",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given sessionId is missing",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given sessionState is missing",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given clientState is missing",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given subjectIdentifier is missing",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given timeToLive is missing",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
          }),
        },
        {
          scenario:
            "Given mandatory attribute values are present but not all the correct type",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: "mockInvalidStringType",
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given redirectUri is present but not of type string",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
            redirectUri: [],
          }),
        },
      ])("$scenario", (invalidBaseSession) => {
        it("Returns null", () => {
          const result = getBaseSessionAttributes(
            invalidBaseSession.attributes,
          );

          expect(result).toEqual(emptyFailure());
        });
      });
    });

    describe("Given a valid base session attribute record", () => {
      describe.each([
        {
          scenario: "Given redirectUri attribute is undefined",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          }),
        },
        {
          scenario: "Given redirectUri attribute is defined",
          attributes: marshall({
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
            redirectUri: "https://www.mockRedirectUri.com",
          }),
        },
      ])("$scenario", (validBaseSession) => {
        it("Returns BaseSessionAttributes", () => {
          const result = getBaseSessionAttributes(validBaseSession.attributes);

          expect(result).toEqual(
            successResult(unmarshall(validBaseSession.attributes)),
          );
        });
      });
    });
  });
});
