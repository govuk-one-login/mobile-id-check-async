import { validateRequestBody } from "./validateRequestBody";
import { mockInvalidUUID, mockSessionId } from "../../testUtils/unitTestData";

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
        scenario: "Given sessionId is not a valid v4 UUID",
        requestBody: { sessionId: mockInvalidUUID },
        expectedErrorMessage: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockInvalidUUID}`,
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
    it("Returns a successResult with a sessionId", () => {
      const result = validateRequestBody(
        JSON.stringify({
          sessionId: mockSessionId,
        }),
      );

      expect(result).toStrictEqual({
        isError: false,
        value: mockSessionId,
      });
    });
  });
});
