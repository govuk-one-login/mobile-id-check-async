import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  NOW_IN_MILLISECONDS,
  validAbortSessionAttributes,
  validBaseSessionAttributes,
  validBiometricSessionFinishedAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../testUtils/unitTestData";
import { errorResult, successResult } from "../../../utils/result";
import { SessionAttributes } from "../session";
import {
  getBaseSessionAttributes,
  getBiometricSessionFinishedSessionAttributes,
  getBiometricTokenIssuedSessionAttributes,
  getAuthSessionAbortedAttributes,
} from "./sessionAttributes";

describe("Session attributes", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
  });

  interface TestScenario {
    scenario: string;
    attributes: Record<string, AttributeValue>;
  }

  const givenAnyCommonSessionAttributeIsInvalid = (
    sessionAttributes: SessionAttributes,
  ): TestScenario[] => {
    return [
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
        scenario: "Given clientId is not a string",
        attributes: marshall({
          ...sessionAttributes,
          clientId: 12345,
        }),
      },
      {
        scenario: "Given govukSigninJourneyId is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          govukSigninJourneyId: undefined,
        }),
      },
      {
        scenario: "Given govukSigninJourneyId is not a string",
        attributes: marshall({
          ...sessionAttributes,
          govukSigninJourneyId: 12345,
        }),
      },
      {
        scenario: "Given createdAt is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          createdAt: undefined,
        }),
      },
      {
        scenario: "Given createdAt is not a number",
        attributes: marshall({
          ...sessionAttributes,
          createdAt: "mockInvalidCreatedAt",
        }),
      },
      {
        scenario: "Given issuer is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          issuer: undefined,
        }),
      },
      {
        scenario: "Given issuer is not a string",
        attributes: marshall({
          ...sessionAttributes,
          issuer: 12345,
        }),
      },
      {
        scenario: "Given sessionId is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          sessionId: undefined,
        }),
      },
      {
        scenario: "Given sessionId is not a string",
        attributes: marshall({
          ...sessionAttributes,
          sessionId: 12345,
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
        scenario: "Given clientState is not a string",
        attributes: marshall({
          ...sessionAttributes,
          clientState: 12345,
        }),
      },
      {
        scenario: "Given subjectIdentifier is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          subjectIdentifier: undefined,
        }),
      },
      {
        scenario: "Given subjectIdentifier is not a string",
        attributes: marshall({
          ...sessionAttributes,
          subjectIdentifier: 12345,
        }),
      },
      {
        scenario: "Given timeToLive is missing",
        attributes: buildSessionAttributes(sessionAttributes, {
          timeToLive: undefined,
        }),
      },
      {
        scenario: "Given timeToLive is not a number",
        attributes: marshall({
          ...sessionAttributes,
          timeToLive: "mockInvalidTimeToLive",
        }),
      },
      {
        scenario: "Given redirectUri is present but not of type string",
        attributes: marshall({
          ...sessionAttributes,
          redirectUri: 12345,
        }),
      },
    ];
  };

  describe("getBaseSessionAttributes", () => {
    describe("Given an invalid base session attribute record", () => {
      describe.each([
        ...givenAnyCommonSessionAttributeIsInvalid(validBaseSessionAttributes),
        {
          scenario: "Given sessionState is not a string",
          attributes: marshall({
            ...validBaseSessionAttributes,
            sessionState: 12345,
          }),
        },
      ])("$scenario", ({ attributes }) => {
        it("Returns an error result with invalid session attributes", () => {
          const result = getBaseSessionAttributes(attributes);
          expect(result).toEqual(
            errorResult({ sessionAttributes: unmarshall(attributes) }),
          );
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
    describe("Given an invalid biometric token issued session attribute record", () => {
      describe.each([
        ...givenAnyCommonSessionAttributeIsInvalid(
          validBiometricTokenIssuedSessionAttributes,
        ),
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
          scenario: "Given documentType is present but not of type string",
          attributes: marshall({
            ...validBiometricTokenIssuedSessionAttributes,
            documentType: 12345,
          }),
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
        {
          scenario: "Given opaqueId is present but not of type string",
          attributes: marshall({
            ...validBiometricTokenIssuedSessionAttributes,
            opaqueId: 12345,
          }),
        },
      ])("$scenario", ({ attributes }) => {
        it("Returns an error result with invalid session attributes", () => {
          const result = getBiometricTokenIssuedSessionAttributes(attributes);
          expect(result).toEqual(
            errorResult({
              sessionAttributes: unmarshall(attributes),
            }),
          );
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

  describe("getBiometricSessionFinishedSessionAttributes", () => {
    describe("Given an invalid biometric session finished attribute record", () => {
      describe.each([
        ...givenAnyCommonSessionAttributeIsInvalid(
          validBiometricSessionFinishedAttributes,
        ),
        {
          scenario: "Given documentType is missing",
          attributes: buildSessionAttributes(
            validBiometricSessionFinishedAttributes,
            {
              documentType: undefined,
            },
          ),
        },
        {
          scenario: "Given documentType is present but not of type string",
          attributes: marshall({
            ...validBiometricSessionFinishedAttributes,
            documentType: 12345,
          }),
        },
        {
          scenario: "Given opaqueId is missing",
          attributes: buildSessionAttributes(
            validBiometricSessionFinishedAttributes,
            {
              opaqueId: undefined,
            },
          ),
        },
        {
          scenario: "Given opaqueId is present but not of type string",
          attributes: marshall({
            ...validBiometricSessionFinishedAttributes,
            opaqueId: 12345,
          }),
        },
        {
          scenario: "Given biometricSessionId is missing",
          attributes: buildSessionAttributes(
            validBiometricSessionFinishedAttributes,
            {
              biometricSessionId: undefined,
            },
          ),
        },
        {
          scenario:
            "Given biometricSessionId is present but not of type string",
          attributes: marshall({
            ...validBiometricSessionFinishedAttributes,
            biometricSessionId: 12345,
          }),
        },
      ])("$scenario", ({ attributes }) => {
        it("Returns an error result with invalid session attributes", () => {
          const result =
            getBiometricSessionFinishedSessionAttributes(attributes);
          expect(result).toEqual(
            errorResult({ sessionAttributes: unmarshall(attributes) }),
          );
        });
      });
    });

    describe("Given a valid biometric session finished attribute record", () => {
      describe.each([
        {
          scenario: "Given redirectUri attribute is undefined",
          attributes: buildSessionAttributes(
            validBiometricSessionFinishedAttributes,
          ),
        },
        {
          scenario: "Given redirectUri attribute is defined",
          attributes: buildSessionAttributes(
            validBiometricSessionFinishedAttributes,
            {
              redirectUri: "https://www.mockRedirectUri.com",
            },
          ),
        },
      ])("$scenario", (validBiometricSessionFinished) => {
        it("Returns successResult with BiometricSessionFinishedAttributes", () => {
          const result = getBiometricSessionFinishedSessionAttributes(
            validBiometricSessionFinished.attributes,
          );

          expect(result).toEqual(
            successResult(unmarshall(validBiometricSessionFinished.attributes)),
          );
        });
      });
    });
  });

  describe("getAuthSessionAbortedAttributes", () => {
    describe("Given an invalid auth session aborted attribute record", () => {
      describe.each([
        ...givenAnyCommonSessionAttributeIsInvalid(validAbortSessionAttributes),
        {
          scenario: "Given sessionState is not AUTH_SESSION_ABORTED",
          attributes: buildSessionAttributes(validAbortSessionAttributes, {
            sessionState: undefined,
          }),
        },
      ])("$scenario", ({ attributes }) => {
        it("Returns an error result with invalid session attributes", () => {
          const result = getAuthSessionAbortedAttributes(attributes);
          expect(result).toEqual(
            errorResult({
              sessionAttributes: unmarshall(attributes),
            }),
          );
        });
      });
    });

    describe("Given a valid auth session aborted attribute record", () => {
      describe.each([
        {
          scenario: "Given redirectUri attribute is undefined",
          attributes: buildSessionAttributes(validAbortSessionAttributes),
        },
        {
          scenario: "Given redirectUri attribute is defined",
          attributes: buildSessionAttributes(validAbortSessionAttributes, {
            redirectUri: "https://www.mockRedirectUri.com",
          }),
        },
      ])("$scenario", (validAuthSessionAborted) => {
        it("Returns successResult with AuthSessionAbortedAttributes", () => {
          const result = getAuthSessionAbortedAttributes(
            validAuthSessionAborted.attributes,
          );

          expect(result).toEqual(
            successResult(unmarshall(validAuthSessionAborted.attributes)),
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
