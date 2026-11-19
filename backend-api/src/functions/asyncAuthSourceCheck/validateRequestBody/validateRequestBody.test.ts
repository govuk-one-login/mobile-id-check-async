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
      postcode: "BA2 5AA"
    };
    let invalidRequestBody: any;
  });
});
