import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";

describe("POST /async/biometricToken", () => {
  describe("Given request body is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const requestBody = {
        sessionId: mockSessionId,
        documentType: "BUS_PASS",
      };

      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description:
          "documentType in request body is invalid. documentType: BUS_PASS",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given there is a valid request", () => {
    it("Returns an error and 501 status code", async () => {
      const requestBody = {
        sessionId: mockSessionId,
        documentType: "NFC_PASSPORT",
      };

      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
