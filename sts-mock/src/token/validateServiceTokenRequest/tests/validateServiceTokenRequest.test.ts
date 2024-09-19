import { validateServiceTokenRequest } from "../validateServiceTokenRequest";

describe("Validate Service Token Request", () => {
  const expectedServiceScope = "testServiceName.testApiName.testAccessLevel";

  describe("Given the request body is undefined", () => {
    it("Returns an error response and the message 'Missing request body'", async () => {
      const requestBody = null;

      const result = validateServiceTokenRequest(
        requestBody,
        expectedServiceScope,
      );

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorCategory: "CLIENT_ERROR",
        errorMessage: "Missing request body",
      });
    });
  });

  describe("Given the request body is missing the key 'subject_token'", () => {
    it("Returns an error response and the message 'Missing subject_token'", async () => {
      const requestBody = "scope=testServiceName.testApiName.testAccessLevel";

      const result = validateServiceTokenRequest(
        requestBody,
        expectedServiceScope,
      );

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorCategory: "CLIENT_ERROR",
        errorMessage: "Missing subject_token",
      });
    });
  });

  describe("Given the request body is missing the key 'scope'", () => {
    it("Returns an error response and the message 'Missing scope'", async () => {
      const requestBody = "subject_token=testSub";

      const result = validateServiceTokenRequest(
        requestBody,
        expectedServiceScope,
      );

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorCategory: "CLIENT_ERROR",
        errorMessage: "Missing scope",
      });
    });
  });

  describe("Given the requested scope is not a supported scope", () => {
    it("Returns an error response and the message 'Unsupported scope'", async () => {
      const requestBody =
        "subject_token=testSub&scope=testServiceName.not.supported";

      const result = validateServiceTokenRequest(
        requestBody,
        expectedServiceScope,
      );

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorCategory: "CLIENT_ERROR",
        errorMessage: "Unsupported scope",
      });
    });
  });

  describe("Given the request body is valid", () => {
    it("Returns a success response", async () => {
      const requestBody =
        "subject_token=testSub&scope=testServiceName.testApiName.testAccessLevel";

      const result = validateServiceTokenRequest(
        requestBody,
        expectedServiceScope,
      );

      expect(result.isError).toStrictEqual(false);
      expect(result.value).toStrictEqual({
        scope: "testServiceName.testApiName.testAccessLevel",
        subjectId: "testSub",
      });
    });
  });
});
