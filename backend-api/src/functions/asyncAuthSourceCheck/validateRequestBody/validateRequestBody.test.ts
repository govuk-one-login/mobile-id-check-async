import {
  IAsyncAuthSourceCheckRequestBody,
  validateRequestBody,
} from "./validateRequestBody";
import { validAuthSourceCheckRequestBody } from "../../testUtils/unitTestData";
import { beforeAll, expect, describe, it } from "vitest";

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

  describe("Given body is valid JSON but userForenames is not well-formed", () => {
    type mutableRequestBody = Partial<IAsyncAuthSourceCheckRequestBody>;
    let mutatedRequestBody: mutableRequestBody = {};

    beforeAll(() => {
      mutatedRequestBody = structuredClone(validAuthSourceCheckRequestBody);
    });

    describe.each([
      {
        scenario: "userForenames is missing",
        mutator: (reqBody: mutableRequestBody) => {
          delete reqBody["userForenames"];
        },
        expectedError: "either null or undefined",
      },
      {
        scenario: "userForenames is a bare empty string",
        mutator: (reqBody: mutableRequestBody) => {
          (reqBody.userForenames as unknown) = "";
        },
        expectedError: "not of type Array<string>",
      },
      {
        scenario: "userForenames is a bare non-empty string",
        mutator: (reqBody: mutableRequestBody) => {
          (reqBody.userForenames as unknown) = "dave";
        },
        expectedError: "not of type Array<string>",
      },
      {
        scenario: "userForenames is a bare number",
        mutator: (reqBody: mutableRequestBody) => {
          (reqBody.userForenames as unknown) = 123;
        },
        expectedError: "not of type Array<string>",
      },
      {
        scenario: "userForenames is an array of numbers",
        mutator: (reqBody: mutableRequestBody) => {
          (reqBody.userForenames as unknown) = [123];
        },
        expectedError: "not of type Array<string>",
      },
    ])("Given $scenario", ({ mutator, expectedError }) => {
      it("Returns an error", () => {
        mutator(mutatedRequestBody);

        const result = validateRequestBody(JSON.stringify(mutatedRequestBody));

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `userForenames in request body is ${expectedError}.`,
          },
        });
      });
    });
  });

  describe("Given body is valid JSON and userForenames is well-formed", () => {
    type mutableRequestBody = Partial<IAsyncAuthSourceCheckRequestBody>;
    let mutatedRequestBody: mutableRequestBody = {};

    beforeAll(() => {
      mutatedRequestBody = structuredClone(validAuthSourceCheckRequestBody);
    });

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
        mutatedRequestBody.userForenames = [];

        const result = validateRequestBody(JSON.stringify(mutatedRequestBody));

        expect(result).toStrictEqual({
          isError: false,
          value: mutatedRequestBody,
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
    // Note 'userForenames' is an Array so handled separately in this suite.
    "userDateOfBirth",
    "validFrom",
    "validUntil",
    "issuingAuthority",
    "licenceNumber",
    "postcode",
  ])("Given an AuthSourceCheck request body with valid JSON", (field) => {
    type mutableRequestBody = Partial<IAsyncAuthSourceCheckRequestBody>;
    let mutatedRequestBody: mutableRequestBody = {};

    beforeAll(() => {
      mutatedRequestBody = structuredClone(validAuthSourceCheckRequestBody);
    });

    describe(`Given field ${field} is missing`, () => {
      it("Returns an error", () => {
        delete mutatedRequestBody[field];

        const result = validateRequestBody(JSON.stringify(mutatedRequestBody));

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${field} in request body is either null or undefined.`,
          },
        });
      });
    });

    describe(`Given field ${field} is empty`, () => {
      if (field === "userForenames") return; // pacify Typescript on next line.

      it("Returns an error result", () => {
        mutatedRequestBody[field] = "";

        const result = validateRequestBody(JSON.stringify(mutatedRequestBody));

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${field} in request body is an empty string.`,
          },
        });
      });
    });

    describe(`Given field ${field} is has wrong type`, () => {
      it("Returns an error result", () => {
        (mutatedRequestBody[field] as unknown) = 123;

        const result = validateRequestBody(JSON.stringify(mutatedRequestBody));

        expect(result).toStrictEqual({
          isError: true,
          value: {
            errorMessage: `${field} in request body is not of type string.`,
          },
        });
      });
    });
  });
});
