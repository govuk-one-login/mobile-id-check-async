import { validateRequestBody } from "./validateRequestBody";
import { expect, it, describe } from "vitest";

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
  });
});
