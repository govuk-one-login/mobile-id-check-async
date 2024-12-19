import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("POST /async/biometricToken", () => {
  describe("Given request body is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        {
          headers: {
            documentType: 123,
          },
        },
      );

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        errorDescription: "Request body invalid",
      });
    });
  });
  describe("Given there is a request", () => {
    it("Returns an error and 501 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        {
          headers: {
            sessionId: "58f4281d-d988-49ce-9586-6ef70a2be0b4",
            documentType: "NFC_PASSPORT",
          },
        },
      );

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
    });
  });
});
