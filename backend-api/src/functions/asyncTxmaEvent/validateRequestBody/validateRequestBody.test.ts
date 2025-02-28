import { mockSessionId } from "../../testUtils/unitTestData";
import { FailureWithValue, SuccessWithValue } from "../../utils/result";
import {
  IAsyncTxmaEventRequestBody,
  IHandleErrorResponse,
  validateRequestBody,
} from "./validateRequestBody";

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
        const result = validateRequestBody(
          requestBody,
        ) as FailureWithValue<IHandleErrorResponse>;
        const errorResult = result.value.handleErrorResponse();
        const errorMessage = JSON.parse(errorResult.body).error_description;

        expect(result.isError).toBe(true);
        expect(errorMessage).toEqual(expectedErrorMessage);
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
        const result = validateRequestBody(
          JSON.stringify(requestBody),
        ) as FailureWithValue<IHandleErrorResponse>;
        const errorResult = result.value.handleErrorResponse();
        const errorMessage = JSON.parse(errorResult.body).error_description;

        expect(result.isError).toBe(true);
        expect(errorMessage).toEqual(expectedErrorMessage);
      });
    });
  });

  describe("Given body is valid", () => {
    it("Returns a successResult with a valid parsed body as value", () => {
      const result = validateRequestBody(
        JSON.stringify({
          sessionId: mockSessionId,
          eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
        }),
      ) as SuccessWithValue<IAsyncTxmaEventRequestBody>;

      expect(result).toStrictEqual({
        isError: false,
        value: {
          sessionId: mockSessionId,
          eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
        },
      });
    });
  });
});
