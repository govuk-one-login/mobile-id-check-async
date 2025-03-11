import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders, mockSessionId } from "./utils/apiTestData";
import { getValidSessionId } from "./utils/apiTestHelpers";

describe("POST /async/txmaEvent", () => {
  describe("Given request body is invalid", () => {
    let response: AxiosResponse;

    beforeAll(async () => {
      const requestBody = {
        sessionId: mockSessionId,
        eventName: "INVALID_EVENT_NAME",
      };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );
    });

    it("Returns an error and 400 status code", async () => {
      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description:
          "eventName in request body is invalid. eventName: INVALID_EVENT_NAME",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given the session is not valid", () => {
    let response: AxiosResponse;

    beforeAll(async () => {
      const requestBody = {
        sessionId: mockSessionId,
        eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
      };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );
    });

    it("Returns an error and 401 status code", async () => {
      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "invalid_session",
        error_description: "Session does not exist or in incorrect state",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given the request is valid", () => {
    let sessionId: string | null;
    let response: AxiosResponse;

    beforeAll(async () => {
      sessionId = await getValidSessionId();
      if (!sessionId) throw new Error("Failed to get valid session ID");
      const biometricTokenRequestBody = {
        sessionId,
        documentType: "NFC_PASSPORT",
      };
      await SESSIONS_API_INSTANCE.post(
        "/async/biometricToken",
        biometricTokenRequestBody,
      );
      const requestBody = {
        sessionId,
        eventName: "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
      };
      response = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );
    }, 25000);

    it("Returns 501 Not Implemented response", () => {
      expect(response.status).toBe(501);
      expect(response.data).toStrictEqual({
        error: "Not Implemented",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
