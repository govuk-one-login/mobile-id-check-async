import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { getBaseSessionAttributes } from "./sessionAttributes";
import { emptyFailure, successResult } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

describe("Session attributes", () => {
  describe("getBaseSessionAttributes", () => {
    const validBaseSessionAttributes = {
      clientId: "mockClientId",
      govukSigninJourneyId: "mockGovukSigninJourneyId",
      createdAt: 12345,
      issuer: "mockIssuer",
      sessionId: "mockSessionId",
      sessionState: SessionState.AUTH_SESSION_CREATED,
      clientState: "mockClientState",
      subjectIdentifier: "mockSubjectIdentifier",
      timeToLive: 12345,
    };

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
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            clientId: undefined,
          }),
        },
        {
          scenario: "Given govukSigninJourneyId is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            govukSigninJourneyId: undefined,
          }),
        },
        {
          scenario: "Given createdAt is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            createdAt: undefined,
          }),
        },
        {
          scenario: "Given issuer is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            issuer: undefined,
          }),
        },
        {
          scenario: "Given sessionId is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            sessionId: undefined,
          }),
        },
        {
          scenario: "Given sessionState is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            sessionState: undefined,
          }),
        },
        {
          scenario: "Given clientState is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            clientState: undefined,
          }),
        },
        {
          scenario: "Given subjectIdentifier is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            subjectIdentifier: undefined,
          }),
        },
        {
          scenario: "Given timeToLive is missing",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            timeToLive: undefined,
          }),
        },
        {
          scenario:
            "Given mandatory attribute values are present but not all the correct type",
          attributes: marshall({
            ...validBaseSessionAttributes,
            createdAt: "mockInvalidStringType",
          }),
        },
        {
          scenario: "Given redirectUri is present but not of type string",
          attributes: marshall({
            ...validBaseSessionAttributes,
            redirectUri: [],
          }),
        },
      ])("$scenario", ({ attributes }) => {
        it("Returns an emptyFailure", () => {
          const result = getBaseSessionAttributes(attributes);
          expect(result).toEqual(emptyFailure());
        });
      });
    });

    describe("Given a valid base session attribute record", () => {
      describe.each([
        {
          scenario: "Given redirectUri attribute is undefined",
          attributes: buildSessionAttributes(validBaseSessionAttributes),
        },
        {
          scenario: "Given redirectUri attribute is defined",
          attributes: buildSessionAttributes(validBaseSessionAttributes, {
            redirectUri: "https://www.mockRedirectUri.com",
          }),
        },
      ])("$scenario", (validBaseSession) => {
        it("Returns successResult with BaseSessionAttributes", () => {
          const result = getBaseSessionAttributes(validBaseSession.attributes);

          expect(result).toEqual(
            successResult(unmarshall(validBaseSession.attributes)),
          );
        });
      });
    });
  });
});

function buildSessionAttributes(
  validSessionAttributes: SessionAttributes,
  overrides: Partial<SessionAttributes> = {},
): Record<string, AttributeValue> {
  const attributes = { ...validSessionAttributes, ...overrides };

  Object.keys(attributes).forEach((key) => {
    if (attributes[key as keyof typeof attributes] === undefined) {
      delete attributes[key as keyof typeof attributes];
    }
  });

  return marshall(attributes);
}
