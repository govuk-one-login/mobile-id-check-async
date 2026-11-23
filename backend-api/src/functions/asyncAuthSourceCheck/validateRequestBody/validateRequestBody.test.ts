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
    sessionId?: string;
    userSurname?: string;
    userForenames?: string[];
    userDateOfBirth?: string;
    validFrom?: string;
    validUntil?: string;
    issuingAuthority?: string;
    licenceNumber?: string;
    postcode?: string;
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
            errorMessage: `${scenario} in request body is an empty string.`,
          },
        });
      });
    });
  });

  describe("Given body is valid JSON but has incorrect field types", () => {
    describe.each([
      {
        scenario: "Given sessionId is not of type string",
        requestBody: { sessionId: 123 },
        expectedErrorMessage: `sessionId in request body is not of type string.`,
      },
      {
        scenario: "Given userSurname is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: 123,
        },
        expectedErrorMessage: `userSurname in request body is not of type string.`,
      },
      {
        scenario: "Given userDateOfBirth is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: 123,
        },
        expectedErrorMessage: `userDateOfBirth in request body is not of type string.`,
      },
      {
        scenario: "Given validFrom is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: 123,
        },
        expectedErrorMessage: `validFrom in request body is not of type string.`,
      },
      {
        scenario: "Given validUntil is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: 123,
        },
        expectedErrorMessage: `validUntil in request body is not of type string.`,
      },
      {
        scenario: "Given issuingAuthority is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: 123,
        },
        expectedErrorMessage: `issuingAuthority in request body is not of type string.`,
      },
      {
        scenario: "Given licenceNumber is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
          licenceNumber: 123,
        },
        expectedErrorMessage: `licenceNumber in request body is not of type string.`,
      },
      {
        scenario: "Given postcode is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
          licenceNumber: validAuthSourceCheckRequestBody.licenceNumber,
          postcode: 123,
        },
        expectedErrorMessage: `postcode in request body is not of type string.`,
      },
      {
        scenario: "Given userForenames is not of type string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userForenames: [123],
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
          licenceNumber: validAuthSourceCheckRequestBody.licenceNumber,
          postcode: validAuthSourceCheckRequestBody.postcode,
        },
        expectedErrorMessage: `userForenames in request body is not an Array<string>.`,
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
});
