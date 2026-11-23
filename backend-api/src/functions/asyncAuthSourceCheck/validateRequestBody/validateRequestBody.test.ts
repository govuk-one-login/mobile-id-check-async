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

  describe("Given body is valid JSON but has one or more required fields missing", () => {
    describe.each([
      {
        scenario: "Given sessionId is missing",
        requestBody: {},
        expectedErrorMessage: `sessionId in request body is either null or undefined.`,
      },
      {
        scenario: "Given userSurname is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
        },
        expectedErrorMessage: `userSurname in request body is either null or undefined.`,
      },
      {
        scenario: "Given userDateOfBirth is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
        },
        expectedErrorMessage: `userDateOfBirth in request body is either null or undefined.`,
      },
      {
        scenario: "Given validFrom is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
        },
        expectedErrorMessage: `validFrom in request body is either null or undefined.`,
      },
      {
        scenario: "Given validUntil is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
        },
        expectedErrorMessage: `validUntil in request body is either null or undefined.`,
      },
      {
        scenario: "Given issuingAuthority is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
        },
        expectedErrorMessage: `issuingAuthority in request body is either null or undefined.`,
      },
      {
        scenario: "Given licenceNumber is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
        },
        expectedErrorMessage: `licenceNumber in request body is either null or undefined.`,
      },
      {
        scenario: "Given postcode is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
          licenceNumber: validAuthSourceCheckRequestBody.licenceNumber,
        },
        expectedErrorMessage: `postcode in request body is either null or undefined.`,
      },
      {
        scenario: "Given userForenames is missing",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
          licenceNumber: validAuthSourceCheckRequestBody.licenceNumber,
          postcode: validAuthSourceCheckRequestBody.postcode,
        },
        expectedErrorMessage: `userForenames in request body is either null or undefined.`,
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

  describe("Given body is valid JSON but has empty field values", () => {
    describe.each([
      {
        scenario: "Given sessionId is an empty string",
        requestBody: { sessionId: "" },
        expectedErrorMessage: `sessionId in request body is an empty string.`,
      },
      {
        scenario: "Given userSurname is an empty string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: "",
        },
        expectedErrorMessage: `userSurname in request body is an empty string.`,
      },
      {
        scenario: "Given userDateOfBirth is an empty string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: "",
        },
        expectedErrorMessage: `userDateOfBirth in request body is an empty string.`,
      },
      {
        scenario: "Given validFrom is an empty string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: "",
        },
        expectedErrorMessage: `validFrom in request body is an empty string.`,
      },
      {
        scenario: "Given validUntil is an empty string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: "",
        },
        expectedErrorMessage: `validUntil in request body is an empty string.`,
      },
      {
        scenario: "Given issuingAuthority is an empty string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: "",
        },
        expectedErrorMessage: `issuingAuthority in request body is an empty string.`,
      },
      {
        scenario: "Given licenceNumber is an empty string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
          licenceNumber: "",
        },
        expectedErrorMessage: `licenceNumber in request body is an empty string.`,
      },
      {
        scenario: "Given postcode is an empty string",
        requestBody: {
          sessionId: validAuthSourceCheckRequestBody.sessionId,
          userSurname: validAuthSourceCheckRequestBody.userSurname,
          userDateOfBirth: validAuthSourceCheckRequestBody.userDateOfBirth,
          validFrom: validAuthSourceCheckRequestBody.validFrom,
          validUntil: validAuthSourceCheckRequestBody.validUntil,
          issuingAuthority: validAuthSourceCheckRequestBody.issuingAuthority,
          licenceNumber: validAuthSourceCheckRequestBody.licenceNumber,
          postcode: "",
        },
        expectedErrorMessage: `postcode in request body is an empty string.`,
      },
      // Note that 'Given userForenames is an empty array' is supported, not an error.
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
