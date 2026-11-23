import { validateRequestBody } from "./validateRequestBody";
import { validAuthSourceCheckRequestBody } from "../../testUtils/unitTestData";
import { expect, it, describe } from "vitest";

describe("Validate request body", () => {
  describe("Given body is not valid JSON", () => {
    describe.each([
      {
        scenario: "Given body is null",
        requestBody: null,
        expectedErrorMessage: "Request body is either null or undefined.",
      },
      {
        scenario: "Given body cannot be parsed as JSON",
        requestBody: "invalidJSON",
        expectedErrorMessage: `Request body could not be parsed as JSON.`,
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
  });

  describe("Given body is valid JSON and is well-formed", () => {
    describe("With a userForenames containing at least 1 element", () => {
      it("Returns an OK result", () => {
        const result = validateRequestBody(
          JSON.stringify(validAuthSourceCheckRequestBody),
        );
        expect(result).toStrictEqual({
          isError: false,
          value: validAuthSourceCheckRequestBody,
        });
      });
    });

    describe("With a userForenames of 0 elements", () => {
      it("Returns an OK result", () => {
        const emptyUserForenamesRequestBody = {
          ...validAuthSourceCheckRequestBody,
        };
        emptyUserForenamesRequestBody.userForenames = [];

        const result = validateRequestBody(
          JSON.stringify(emptyUserForenamesRequestBody),
        );

        expect(result).toStrictEqual({
          isError: false,
          value: emptyUserForenamesRequestBody,
        });
      });
    });
  });

  describe("Given body is valid JSON but not an Object", () => {
    describe.each([
      {
        requestBody: "null",
      },
      {
        requestBody: "true",
      },
      {
        requestBody: "false",
      },
      {
        requestBody: "[]",
      },
      {
        requestBody: "123",
      },
    ])("Top-level element is $requestBody", ({ requestBody }) => {
      it("Returns an error result", () => {
        const result = validateRequestBody(requestBody);
        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: "Request body JSON is not structured as an Object",
          },
        });
      });
    });
  });

  interface mutableRequestBody {
    sessionId?: string|number;
    userSurname?: string|number;
    userForenames?: string[]|number[];
    userDateOfBirth?: string|number;
    validFrom?: string|number;
    validUntil?: string|number;
    issuingAuthority?: string|number;
    licenceNumber?: string|number;
    postcode?: string|number;
  }

  describe("Given body is valid JSON but has one or more required fields missing", () => {
    describe.each([
      {
        scenario: "sessionId",
        mutateRequest: (request: mutableRequestBody) => { delete request.sessionId },
      },
      {
        scenario: "userSurname",
        mutateRequest: (request: mutableRequestBody) => { delete request.userSurname },
      },
      {
        scenario: "userForenames",
        mutateRequest: (request: mutableRequestBody) => { delete request.userForenames },
      },
      {
        scenario: "userDateOfBirth",
        mutateRequest: (request: mutableRequestBody) => { delete request.userDateOfBirth },
      },
      {
        scenario: "validFrom",
        mutateRequest: (request: mutableRequestBody) => { delete request.validFrom },
      },
      {
        scenario: "validUntil",
        mutateRequest: (request: mutableRequestBody) => { delete request.validUntil },
      },
      {
        scenario: "licenceNumber",
        mutateRequest: (request: mutableRequestBody) => { delete request.licenceNumber },
      },
      {
        scenario: "postcode",
        mutateRequest: (request: mutableRequestBody) => { delete request.postcode },
      },
    ])("Given $scenario is missing", ({ scenario, mutateRequest }) => {
      it("Returns an error result", () => {
        const requestBodyWithMissingField = {
          ...validAuthSourceCheckRequestBody,
        } as mutableRequestBody;

        mutateRequest(requestBodyWithMissingField);

        const result = validateRequestBody(
          JSON.stringify(requestBodyWithMissingField),
        );

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${scenario} in request body is either null or undefined.`,
          },
        });
      });
    });
  });

  describe("Given body is valid JSON but has one or more empty fields", () => {
    describe.each([
      {
        scenario: "sessionId",
        mutateRequest: (request: mutableRequestBody) => { request.sessionId = "" },
      },
      {
        scenario: "userSurname",
        mutateRequest: (request: mutableRequestBody) => { request.userSurname = "" },
      },
      // Note: no scenario 'userForenames' as we accept an empty array here.
      {
        scenario: "userDateOfBirth",
        mutateRequest: (request: mutableRequestBody) => { request.userDateOfBirth = "" },
      },
      {
        scenario: "validFrom",
        mutateRequest: (request: mutableRequestBody) => { request.validFrom = "" },
      },
      {
        scenario: "validUntil",
        mutateRequest: (request: mutableRequestBody) => { request.validUntil = "" },
      },
      {
        scenario: "licenceNumber",
        mutateRequest: (request: mutableRequestBody) => { request.licenceNumber = "" },
      },
      {
        scenario: "postcode",
        mutateRequest: (request: mutableRequestBody) => { request.postcode = "" },
      },
    ])("Given $scenario is present but empty", ({ scenario, mutateRequest }) => {
      it("Returns an error result", () => {
        const requestBodyWithEmptyField = {
          ...validAuthSourceCheckRequestBody,
        } as mutableRequestBody;

        mutateRequest(requestBodyWithEmptyField);

        const result = validateRequestBody(
          JSON.stringify(requestBodyWithEmptyField),
        );

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${scenario} in request body is an empty string.`,
          },
        });
      });
    });
  });

  describe("Given body is valid JSON but has a field of the incorrect type", () => {
    describe.each([
      {
        scenario: "sessionId",
        mutateRequest: (request: mutableRequestBody) => { request.sessionId = 123 },
      },
      {
        scenario: "userSurname",
        mutateRequest: (request: mutableRequestBody) => { request.userSurname = 123 },
      },
      {
        scenario: "userForenames",
        mutateRequest: (request: mutableRequestBody) => { request.userForenames = [123] },
        errorTypeIfNotString: "Array<string>",
      },
      {
        scenario: "userDateOfBirth",
        mutateRequest: (request: mutableRequestBody) => { request.userDateOfBirth = 123 },
      },
      {
        scenario: "validFrom",
        mutateRequest: (request: mutableRequestBody) => { request.validFrom = 123 },
      },
      {
        scenario: "validUntil",
        mutateRequest: (request: mutableRequestBody) => { request.validUntil = 123 },
      },
      {
        scenario: "licenceNumber",
        mutateRequest: (request: mutableRequestBody) => { request.licenceNumber = 123 },
      },
      {
        scenario: "postcode",
        mutateRequest: (request: mutableRequestBody) => { request.postcode = 123 },
      },
    ])("Given $scenario is not of type string", ({ scenario, mutateRequest, errorTypeIfNotString }) => {
      it("Returns an error result", () => {
        const requestBodyWithWrongFieldType = {
          ...validAuthSourceCheckRequestBody,
        } as mutableRequestBody;

        mutateRequest(requestBodyWithWrongFieldType);

        const result = validateRequestBody(
          JSON.stringify(requestBodyWithWrongFieldType),
        );

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${scenario} in request body is not of type ${errorTypeIfNotString || "string"}.`,
          },
        });
      });
    });
  });
});
