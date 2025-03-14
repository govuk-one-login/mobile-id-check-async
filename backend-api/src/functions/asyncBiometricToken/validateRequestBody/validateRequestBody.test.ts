import { validateRequestBody } from "./validateRequestBody";
import { mockSessionId } from "../../testUtils/unitTestData";

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
        scenario: "Given sessionId is an empty string",
        requestBody: { sessionId: "" },
        expectedErrorMessage: "sessionId in request body is an empty string.",
      },
      {
        scenario: "Given documentType is not present",
        requestBody: { sessionId: mockSessionId },
        expectedErrorMessage:
          "documentType in request body is either null or undefined.",
      },
      {
        scenario: "Given documentType is not a string",
        requestBody: {
          sessionId: mockSessionId,
          documentType: 123,
        },
        expectedErrorMessage:
          "documentType in request body is not of type string. documentType: 123",
      },
      {
        scenario: "Given documentType is an empty string",
        requestBody: {
          sessionId: mockSessionId,
          documentType: "",
        },
        expectedErrorMessage:
          "documentType in request body is an empty string.",
      },
      {
        scenario: "Given documentType is an invalid document type",
        requestBody: {
          sessionId: mockSessionId,
          documentType: "BUS_PASS",
        },
        expectedErrorMessage:
          "documentType in request body is invalid. documentType: BUS_PASS",
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
          documentType: "NFC_PASSPORT",
        }),
      );

      expect(result).toStrictEqual({
        isError: false,
        value: {
          sessionId: mockSessionId,
          documentType: "NFC_PASSPORT",
        },
      });
    });
  });
});
