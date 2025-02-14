import { validateRequestBody } from "./validateRequestBody";
import {
  mockBiometricSessionId,
  mockInvalidUUID,
  mockSessionId,
} from "../../testUtils/unitTestData";

describe("Validate request body", () => {
  describe("Given body is invalid", () => {
    describe.each([
      {
        scenario: "Given body is null or undefined",
        requestBody: null,
        expectedErrorMessage: "Request body is either null or undefined.",
      },
      {
        scenario: "Given body cannot be parsed as JSON",
        requestBody: "invalidJSON",
        expectedErrorMessage: `Request body could not be parsed as JSON. SyntaxError: Unexpected token 'i', "invalidJSON" is not valid JSON`,
      },
    ])("$scenario", ({ requestBody, expectedErrorMessage }) => {
      it("Returns an error result", () => {
        const result = validateRequestBody(requestBody);

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: expectedErrorMessage,
          },
        });
      });
    });

    describe.each([
      {
        scenario: "Given sessionId is not present",
        requestBody: {},
        expectedErrorMessage:
          "sessionId in request body is either null or undefined.",
      },
      {
        scenario: "Given sessionId is not a string",
        requestBody: { sessionId: 123 },
        expectedErrorMessage:
          "sessionId in request body is not of type string. sessionId: 123",
      },
      {
        scenario: "Given sessionId is not a valid UUID",
        requestBody: { sessionId: mockInvalidUUID },
        expectedErrorMessage: `sessionId in request body is not a valid UUID. sessionId: ${mockInvalidUUID}`,
      },
      {
        scenario: "Given biometricSessionId is not present",
        requestBody: { sessionId: mockSessionId },
        expectedErrorMessage:
          "biometricSessionId in request body is either null or undefined.",
      },
      {
        scenario: "Given biometricSessionId is not a string",
        requestBody: {
          sessionId: mockSessionId,
          biometricSessionId: 123,
        },
        expectedErrorMessage:
          "biometricSessionId in request body is not of type string. biometricSessionId: 123",
      },
    ])("$scenario", ({ requestBody, expectedErrorMessage }) => {
      it("Returns an error result", () => {
        const result = validateRequestBody(JSON.stringify(requestBody));

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: expectedErrorMessage,
          },
        });
      });
    });
  });

  describe("Given body is valid", () => {
    it("Returns a successResult with a valid parsed body as value", () => {
      const result = validateRequestBody(
        JSON.stringify({
          sessionId: mockSessionId,
          biometricSessionId: mockBiometricSessionId,
        }),
      );

      expect(result).toStrictEqual({
        isError: false,
        value: {
          sessionId: mockSessionId,
          biometricSessionId: mockBiometricSessionId,
        },
      });
    });
  });
});
