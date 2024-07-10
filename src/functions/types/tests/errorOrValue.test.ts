import { errorResponse, successResponse } from "../errorOrValue";

describe("Error or value", () => {
  describe("Given there is an error", () => {
    it("An error response is returned", () => {
      const response = errorResponse("mockErrorMessage");
      expect(response.isError).toBe(true);
      expect(response.value).toBe("mockErrorMessage");
    });
  });
  describe("Given the operation completed successfully", () => {
    it("A success response is returned", () => {
      const response = successResponse("mockSuccessResponse");
      expect(response.isError).toBe(false);
      expect(response.value).toBe("mockSuccessResponse");
    });
  });
});
