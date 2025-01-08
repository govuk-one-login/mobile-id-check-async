import { ErrorCategory, errorResult, Result, successResult } from "../result";

describe("Result", () => {
  describe("Given there is an error", () => {
    it("An error response is returned", () => {
      const returnErrorWithoutTypeOverride = (): Result<null> => {
        return errorResult({
          errorMessage: "mockErrorResponse",
          errorCategory: ErrorCategory.CLIENT_ERROR,
        });
      };
      const result = returnErrorWithoutTypeOverride();
      if (result.isError) {
        expect(result.isError).toBe(true);
        expect(result.value.errorMessage).toBe("mockErrorResponse");
        expect(result.value.errorCategory).toBe(ErrorCategory.CLIENT_ERROR);
      }
      expect.assertions(3);
    });
  });

  describe("Given the operation completed successfully", () => {
    it("A success response is returned", () => {
      const returnSuccessResponse = (): Result<string> => {
        return successResult("mockSuccessResponse");
      };
      const response = returnSuccessResponse();
      if (!response.isError) {
        expect(response.isError).toBe(false);
        expect(response.value).toBe("mockSuccessResponse");
      }

      expect.assertions(2);
    });
  });
});
