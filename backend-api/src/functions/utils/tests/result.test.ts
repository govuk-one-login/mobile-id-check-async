import { errorResult, Result, successResult } from "../result";

describe("Result", () => {
  describe("Given there is an error and the return type is not specified", () => {
    it("An error response is returned with a string", () => {
      const returnErrorWithoutTypeOverride = (): Result<null> => {
        return errorResult("mockErrorResponse");
      };
      const result = returnErrorWithoutTypeOverride();
      expect(result.isError).toBe(true);
      expect(result.value).toBe("mockErrorResponse");
    });
  });
  describe("Given there is an error and the return type is overriden", () => {
    it("An error response is returned with a number", () => {
      const returnErrorWithTypeOverride = (): Result<null, number> => {
        return errorResult(10);
      };

      const result = returnErrorWithTypeOverride();
      expect(result.isError).toBe(true);
      expect(result.value).toBe(10);
    });
  });
  describe("Given the operation completed successfully", () => {
    it("A success response is returned", () => {
      const returnSuccessResponse = (): Result<string> => {
        return successResult("mockSuccessResponse");
      };
      const response = returnSuccessResponse();
      expect(response.isError).toBe(false);
      expect(response.value).toBe("mockSuccessResponse");
    });
  });
});
