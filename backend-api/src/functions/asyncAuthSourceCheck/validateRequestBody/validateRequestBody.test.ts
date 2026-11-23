import { IAsyncAuthSourceCheckRequestBody, validateRequestBody } from "./validateRequestBody";
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

  type mutableRequestBody = Partial<IAsyncAuthSourceCheckRequestBody>;

  describe("Given body is valid JSON but has one or more required fields missing", () => {
    describe.each([
      {
        missingField: "sessionId",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.sessionId;
        },
      },
      {
        missingField: "userSurname",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.userSurname;
        },
      },
      {
        missingField: "userForenames",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.userForenames;
        },
      },
      {
        missingField: "userDateOfBirth",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.userDateOfBirth;
        },
      },
      {
        missingField: "validFrom",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.validFrom;
        },
      },
      {
        missingField: "validUntil",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.validUntil;
        },
      },
      {
        missingField: "licenceNumber",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.licenceNumber;
        },
      },
      {
        missingField: "postcode",
        mutateRequest: (request: mutableRequestBody) => {
          delete request.postcode;
        },
      },
    ])("Given $missingField is missing", ({ missingField, mutateRequest }) => {
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
            errorMessage: `${missingField} in request body is either null or undefined.`,
          },
        });
      });
    });
  });

  describe("Given body is valid JSON but has one or more empty fields", () => {
    describe.each([
      {
        emptyField: "sessionId",
        mutateRequest: (request: mutableRequestBody) => {
          request.sessionId = "";
        },
      },
      {
        emptyField: "userSurname",
        mutateRequest: (request: mutableRequestBody) => {
          request.userSurname = "";
        },
      },
      // Note: no emptyField 'userForenames' as we accept an empty array here.
      {
        emptyField: "userDateOfBirth",
        mutateRequest: (request: mutableRequestBody) => {
          request.userDateOfBirth = "";
        },
      },
      {
        emptyField: "validFrom",
        mutateRequest: (request: mutableRequestBody) => {
          request.validFrom = "";
        },
      },
      {
        emptyField: "validUntil",
        mutateRequest: (request: mutableRequestBody) => {
          request.validUntil = "";
        },
      },
      {
        emptyField: "licenceNumber",
        mutateRequest: (request: mutableRequestBody) => {
          request.licenceNumber = "";
        },
      },
      {
        emptyField: "postcode",
        mutateRequest: (request: mutableRequestBody) => {
          request.postcode = "";
        },
      },
    ])(
      "Given $emptyField is present but empty",
      ({ emptyField, mutateRequest }) => {
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
              errorMessage: `${emptyField} in request body is an empty string.`,
            },
          });
        });
      },
    );
  });

  describe("Given body is valid JSON but has a field of the incorrect type", () => {
    describe.each([
      {
        wrongTypeField: "sessionId",
        mutateRequest: (request: mutableRequestBody) => {
          (request.sessionId as unknown) = 123;
        },
      },
      {
        wrongTypeField: "userSurname",
        mutateRequest: (request: mutableRequestBody) => {
          (request.userSurname as unknown) = 123;
        },
      },
      {
        wrongTypeField: "userForenames",
        mutateRequest: (request: mutableRequestBody) => {
          (request.userForenames as unknown)  = [123];
        },
        errorTypeIfNotString: "Array<string>",
      },
      {
        wrongTypeField: "userDateOfBirth",
        mutateRequest: (request: mutableRequestBody) => {
          (request.userDateOfBirth as unknown)  = 123;
        },
      },
      {
        wrongTypeField: "validFrom",
        mutateRequest: (request: mutableRequestBody) => {
          (request.validFrom as unknown)  = 123;
        },
      },
      {
        wrongTypeField: "validUntil",
        mutateRequest: (request: mutableRequestBody) => {
          (request.validUntil as unknown)  = 123;
        },
      },
      {
        wrongTypeField: "licenceNumber",
        mutateRequest: (request: mutableRequestBody) => {
          (request.licenceNumber as unknown)  = 123;
        },
      },
      {
        wrongTypeField: "postcode",
        mutateRequest: (request: mutableRequestBody) => {
          (request.postcode as unknown)  = 123;
        },
      },
    ])(
      "Given $wrongTypeField is not of type string",
      ({ wrongTypeField, mutateRequest, errorTypeIfNotString }) => {
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
              errorMessage: `${wrongTypeField} in request body is not of type ${errorTypeIfNotString || "string"}.`,
            },
          });
        });
      },
    );
  });
});
