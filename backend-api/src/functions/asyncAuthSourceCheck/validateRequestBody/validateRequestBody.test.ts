import {
  IAsyncAuthSourceCheckRequestBody,
  validateRequestBody,
} from "./validateRequestBody";
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

  describe.each<keyof IAsyncAuthSourceCheckRequestBody>([
    "sessionId",
    "userSurname",
    "userForenames",
    "userDateOfBirth",
    "validFrom",
    "validUntil",
    "issuingAuthority",
    "licenceNumber",
    "postcode",
  ])("Given an AuthSourceCheck request body with valid JSON", (field) => {
    type mutableRequestBody = Partial<IAsyncAuthSourceCheckRequestBody>;

    describe(`Given field ${field} is missing`, () => {
      it("Returns an error", () => {
        const requestBodyWithMissingField = {
          ...validAuthSourceCheckRequestBody,
        } as mutableRequestBody;

        delete requestBodyWithMissingField[field];

        const result = validateRequestBody(
          JSON.stringify(requestBodyWithMissingField),
        );

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${field} in request body is either null or undefined.`,
          },
        });
      });
    });

    describe(`Given field ${field} is empty`, () => {
      it("Returns an error result", () => {
        const requestBodyWithEmptyField = {
          ...validAuthSourceCheckRequestBody,
        } as mutableRequestBody;

        if (field === "userForenames") return; // it's OK for userForenames to be empty.
        requestBodyWithEmptyField[field] = "";

        const result = validateRequestBody(
          JSON.stringify(requestBodyWithEmptyField),
        );

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${field} in request body is an empty string.`,
          },
        });
      });
    });

    describe(`Given field ${field} is has wrong type`, () => {
      it("noop", () => {
        const requestBodyWithWrongFieldType = {
          ...validAuthSourceCheckRequestBody,
        } as mutableRequestBody;

        // Special-case userForenames, the only Array field in the response struct.
        (requestBodyWithWrongFieldType[field] as unknown) =
          field === "userForenames" ? [123] : 123;
        const errMsgType =
          field === "userForenames" ? "Array<string>" : "string";

        const result = validateRequestBody(
          JSON.stringify(requestBodyWithWrongFieldType),
        );

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${field} in request body is not of type ${errMsgType}.`,
          },
        });
      });
    });
  });
});
