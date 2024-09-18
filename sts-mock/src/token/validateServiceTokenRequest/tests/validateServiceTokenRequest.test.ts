import { validateServiceTokenRequest } from "../validateServiceTokenRequest";

describe("Validate Service Token Request", () => {
  describe("Given the request body is undefined", () => {
    it("Returns an error response and the message 'Missing request body'", async () => {
      const requestBody = null;

      const result = validateServiceTokenRequest(requestBody);

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorCategory: "CLIENT_ERROR",
        errorMessage: "Missing request body",
      });
    });
  });

  describe("Given the request body is missing the key 'subject_token'", () => {
    it("Returns an error response and the message 'Missing subject_token'", async () => {
      const requestBody =
        "scope=mock_service_name.mock_apiName.mock_accessLevel";

      const result = validateServiceTokenRequest(requestBody);

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

      const result = validateServiceTokenRequest(requestBody);

      expect(result.isError).toStrictEqual(true);
      expect(result.value).toStrictEqual({
        errorCategory: "CLIENT_ERROR",
        errorMessage: "Missing scope",
      });
    });
  });

  describe("Given the request body is invalid", () => {
    it("Returns a success response", async () => {
      const requestBody =
        "subject_token=testSub&scope=mock_service_name.mock_apiName.mock_accessLevel";

      const result = validateServiceTokenRequest(requestBody);

      expect(result.isError).toStrictEqual(false);
      expect(result.value).toStrictEqual({
        scope: "mock_service_name.mock_apiName.mock_accessLevel",
        subjectId: "testSub",
      });
    });
  });
});
