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
        scenario: "Given sessionId is an empty string",
        requestBody: { sessionId: "" },
        expectedErrorMessage: "sessionId in request body is an empty string.",
      },
      {
        scenario: "Given sessionId is not a valid v4 UUID",
        requestBody: { sessionId: mockInvalidUUID },
        expectedErrorMessage: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockInvalidUUID}`,
      },
      {
        scenario: "Given eventName is not present",
        requestBody: { sessionId: mockSessionId },
        expectedErrorMessage:
          "eventName in request body is either null or undefined.",
      },
      {
        scenario: "Given eventName is not a string",
        requestBody: {
          sessionId: mockSessionId,
          eventName: 123,
        },
        expectedErrorMessage:
          "eventName in request body is not of type string. eventName: 123",
      },
      {
        scenario: "Given eventName is an empty string",
        requestBody: {
          sessionId: mockSessionId,
          eventName: "",
        },
        expectedErrorMessage: "eventName in request body is an empty string.",
      },
      {
        scenario: "Given eventName is an invalid document type",
        requestBody: {
          sessionId: mockSessionId,
          eventName: "INVALID_EVENT_NAME",
        },
        expectedErrorMessage:
          "eventName in request body is invalid. eventName: INVALID_EVENT_NAME",
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
    describe.each([
      { eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED" },
      { eventName: "DCMAW_ASYNC_READID_NFC_BILLING_STARTED" },
      { eventName: "DCMAW_ASYNC_IPROOV_BILLING_STARTED" },
    ])("Given the event name is $eventName", ({ eventName }) => {
      it(`Returns a successResult for ${eventName} with a valid parsed body as value`, () => {
        const result = validateRequestBody(
          JSON.stringify({
            sessionId: mockSessionId,
            eventName: eventName,
          }),
        );

        expect(result).toStrictEqual({
          isError: false,
          value: {
            sessionId: mockSessionId,
            eventName: eventName,
          },
        });
      });
    });
  });
});
