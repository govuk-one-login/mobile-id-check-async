import { validateRequestBody } from "./validateRequestBody";
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
  });

  describe("Given body is valid JSON but has required fields missing", () => {
    const validRequestBody = {
      sessionId: "fe4b8e97-fe75-4a61-b85e-f0a2c5cea446",
      opaqueId: "4c5f83fc-4fae-41bf-88f9-03730119c77f",
      userSurname: "DECERQUEIRA",
      userForenames: ["KENNETH"],
      userDateOfBirth: "1965-07-08",
      validFrom: "2018-01-01",
      validUntil: "2027-12-31",
      issuingAuthority: "DVLA",
      licenceNumber: "DECER607085K912305",
      postcode: "BA2 5AA",
    };
    describe.each([
      {
        scenario: "Given sessionId is missing",
        requestBody: {},
        expectedErrorMessage: `sessionId in request body is either null or undefined.`,
      },
      {
        scenario: "Given opaqueId is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
        },
        expectedErrorMessage: `opaqueId in request body is either null or undefined.`,
      },
      {
        scenario: "Given userSurname is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
        },
        expectedErrorMessage: `userSurname in request body is either null or undefined.`,
      },
      {
        scenario: "Given userDateOfBirth is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
        },
        expectedErrorMessage: `userDateOfBirth in request body is either null or undefined.`,
      },
      {
        scenario: "Given validFrom is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
        },
        expectedErrorMessage: `validFrom in request body is either null or undefined.`,
      },
      {
        scenario: "Given validUntil is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
        },
        expectedErrorMessage: `validUntil in request body is either null or undefined.`,
      },
      {
        scenario: "Given issuingAuthority is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
        },
        expectedErrorMessage: `issuingAuthority in request body is either null or undefined.`,
      },
      {
        scenario: "Given licenceNumber is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
          issuingAuthority: validRequestBody.issuingAuthority,
        },
        expectedErrorMessage: `licenceNumber in request body is either null or undefined.`,
      },
      {
        scenario: "Given postcode is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
          issuingAuthority: validRequestBody.issuingAuthority,
          licenceNumber: validRequestBody.licenceNumber,
        },
        expectedErrorMessage: `postcode in request body is either null or undefined.`,
      },
      {
        scenario: "Given userForenames is missing",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
          issuingAuthority: validRequestBody.issuingAuthority,
          licenceNumber: validRequestBody.licenceNumber,
          postcode: validRequestBody.postcode,
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

  describe("Given body is valid JSON but has incorrect field types", () => {
    const validRequestBody = {
      sessionId: "fe4b8e97-fe75-4a61-b85e-f0a2c5cea446",
      opaqueId: "4c5f83fc-4fae-41bf-88f9-03730119c77f",
      userSurname: "DECERQUEIRA",
      userForenames: ["KENNETH"],
      userDateOfBirth: "1965-07-08",
      validFrom: "2018-01-01",
      validUntil: "2027-12-31",
      issuingAuthority: "DVLA",
      licenceNumber: "DECER607085K912305",
      postcode: "BA2 5AA",
    };
    describe.each([
      {
        scenario: "Given sessionId is not of type string",
        requestBody: { sessionId: 123 },
        expectedErrorMessage: `sessionId in request body is not of type string. sessionId: 123`,
      },
      {
        scenario: "Given opaqueId is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: 123,
        },
        expectedErrorMessage: `opaqueId in request body is not of type string. opaqueId: 123`,
      },
      {
        scenario: "Given userSurname is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: 123,
        },
        expectedErrorMessage: `userSurname in request body is not of type string. userSurname: 123`,
      },
      {
        scenario: "Given userDateOfBirth is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: 123,
        },
        expectedErrorMessage: `userDateOfBirth in request body is not of type string. userDateOfBirth: 123`,
      },
      {
        scenario: "Given validFrom is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: 123,
        },
        expectedErrorMessage: `validFrom in request body is not of type string. validFrom: 123`,
      },
      {
        scenario: "Given validUntil is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: 123,
        },
        expectedErrorMessage: `validUntil in request body is not of type string. validUntil: 123`,
      },
      {
        scenario: "Given issuingAuthority is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
          issuingAuthority: 123,
        },
        expectedErrorMessage: `issuingAuthority in request body is not of type string. issuingAuthority: 123`,
      },
      {
        scenario: "Given licenceNumber is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
          issuingAuthority: validRequestBody.issuingAuthority,
          licenceNumber: 123,
        },
        expectedErrorMessage: `licenceNumber in request body is not of type string. licenceNumber: 123`,
      },
      {
        scenario: "Given postcode is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
          issuingAuthority: validRequestBody.issuingAuthority,
          licenceNumber: validRequestBody.licenceNumber,
          postcode: 123,
        },
        expectedErrorMessage: `postcode in request body is not of type string. postcode: 123`,
      },
      {
        scenario: "Given userForenames is not of type string",
        requestBody: {
          sessionId: validRequestBody.sessionId,
          opaqueId: validRequestBody.opaqueId,
          userSurname: validRequestBody.userSurname,
          userForenames: [123],
          userDateOfBirth: validRequestBody.userDateOfBirth,
          validFrom: validRequestBody.validFrom,
          validUntil: validRequestBody.validUntil,
          issuingAuthority: validRequestBody.issuingAuthority,
          licenceNumber: validRequestBody.licenceNumber,
          postcode: validRequestBody.postcode,
        },
        expectedErrorMessage: `userForenames in request body is not an Array<string>. userForenames: [123]`,
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
