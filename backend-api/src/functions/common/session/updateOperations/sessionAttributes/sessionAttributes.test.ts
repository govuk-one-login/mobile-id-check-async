import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  getBaseSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
} from "./sessionAttributes";
import { emptyFailure, successResult } from "../../../../utils/result";
import { SessionAttributes, SessionState } from "../../session";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

describe("Session attributes", () => {
  interface TestScenario {
    scenario: string;
    attributes: Record<string, AttributeValue> | undefined;
  }

  const givenAnyCommonSessionAttributeIsUndefined = (
    sessionAttributes: SessionAttributes,
  ): TestScenario[] => {
    return [
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
        attributes: buildSessionAttributes(sessionAttributes, {
          clientId: undefined,
        }),
      },
      {
        scenario: "Given govukSigninJourneyId is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          govukSigninJourneyId: undefined,
        }),
      },
      {
        scenario: "Given createdAt is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          createdAt: undefined,
        }),
      },
      {
        scenario: "Given issuer is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          issuer: undefined,
        }),
      },
      {
        scenario: "Given sessionId is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          sessionId: undefined,
        }),
      },
      {
        scenario: "Given sessionState is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          sessionState: undefined,
        }),
      },
      {
        scenario: "Given clientState is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          clientState: undefined,
        }),
      },
      {
        scenario: "Given subjectIdentifier is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          subjectIdentifier: undefined,
        }),
      },
      {
        scenario: "Given timeToLive is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          timeToLive: undefined,
        }),
      },
    ];
  };

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
        ...givenAnyCommonSessionAttributeIsUndefined(
          validBaseSessionAttributes,
        ),
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

  describe("getBiometricTokenIssuedSessionAttributes", () => {
    const validBiometricTokenIssuedSessionAttributes = {
      clientId: "mockClientId",
      govukSigninJourneyId: "mockGovukSigninJourneyId",
      createdAt: 12345,
      issuer: "mockIssuer",
      sessionId: "mockSessionId",
      sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
      clientState: "mockClientState",
      subjectIdentifier: "mockSubjectIdentifier",
      timeToLive: 12345,
      documentType: "NFC_PASSPORT",
      opaqueId: "mockOpaqueId",
    };

    describe("Given an invalid biometric token issued session attribute record", () => {
      describe.each([
        ...givenAnyCommonSessionAttributeIsUndefined(
          validBiometricTokenIssuedSessionAttributes,
        ),
        {
          scenario:
            "Given mandatory attribute values are present but not all the correct type",
          attributes: marshall({
            ...validBiometricTokenIssuedSessionAttributes,
            createdAt: "mockInvalidStringType",
          }),
        },
        {
          scenario: "Given redirectUri is present but not of type string",
          attributes: marshall({
            ...validBiometricTokenIssuedSessionAttributes,
            redirectUri: [],
          }),
        },
        {
          scenario: "Given documentType is missing",
          attributes: buildSessionAttributes(
            validBiometricTokenIssuedSessionAttributes,
            {
              documentType: undefined,
            },
          ),
        },
        {
          scenario: "Given opaqueId is missing",
          attributes: buildSessionAttributes(
            validBiometricTokenIssuedSessionAttributes,
            {
              opaqueId: undefined,
            },
          ),
        },
      ])("$scenario", ({ attributes }) => {
        it("Returns an emptyFailure", () => {
          const result = getBiometricTokenIssuedSessionAttributes(attributes);
          expect(result).toEqual(emptyFailure());
        });
      });
    });

    describe("Given a valid biometric token issued session attribute record", () => {
      describe.each([
        {
          scenario: "Given redirectUri attribute is undefined",
          attributes: buildSessionAttributes(
            validBiometricTokenIssuedSessionAttributes,
          ),
        },
        {
          scenario: "Given redirectUri attribute is defined",
          attributes: buildSessionAttributes(
            validBiometricTokenIssuedSessionAttributes,
            {
              redirectUri: "https://www.mockRedirectUri.com",
            },
          ),
        },
      ])("$scenario", (validBiometricTokenIssuedSession) => {
        it("Returns successResult with BiometricTokenIssuedSessionAttributes", () => {
          const result = getBiometricTokenIssuedSessionAttributes(
            validBiometricTokenIssuedSession.attributes,
          );

          expect(result).toEqual(
            successResult(
              unmarshall(validBiometricTokenIssuedSession.attributes),
            ),
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
