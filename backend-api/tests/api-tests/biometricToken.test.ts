import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";

describe("POST /async/biometricToken", () => {
  const sessionId = "58f4281d-d988-49ce-9586-6ef70a2be0b4";
  const expectedSecurityHeaders = {
    "cache-control": "no-store",
    "content-type": "application/json",
    "strict-transport-security": "max-age=31536000",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
  describe("Given request body is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const requestBody = {
        sessionId,
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
        sessionId,
        documentType: "NFC_PASSPORT",
      };

      const response = await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        requestBody,
      );

      console.log("HERE", response.headers);

      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({ error: "Not Implemented" });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
