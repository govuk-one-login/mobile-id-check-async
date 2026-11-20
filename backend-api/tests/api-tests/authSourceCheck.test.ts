import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders } from "./utils/apiTestData";
import { validAuthSourceCheckRequestBody } from "../../src/functions/testUtils/unitTestData";
import { expect, it, describe, beforeAll } from "vitest";

describe("POST /async/authSourceCheck", () => {
  describe("Given a request body with missing fields", () => {
    let response: AxiosResponse;

    beforeAll(async () => {
      const requestBody = { sessionId: "unused" };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/authSourceCheck",
        requestBody,
      );
    });

    it("Returns a 400 'Bad Request' status code", async () => {
      expect(response.status).toBe(400);
      expect(response.statusText).toBe("Bad Request");
    });

    it("Returns a descriptive error message", async () => {
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description:
          "userSurname in request body is either null or undefined.",
      });
    });

    it("Returns a standard security headers", async () => {
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given a request body with all required fields present", () => {
    let response: AxiosResponse;

    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post(
        "/async/authSourceCheck",
        validAuthSourceCheckRequestBody,
      );
    });

    it("Returns a 501 'Not Implemented' status code", async () => {
      expect(response.status).toBe(501);
      expect(response.statusText).toBe("Not Implemented");
    });

    it("Returns a descriptive error message", async () => {
      expect(response.data).toStrictEqual({
        error: "Not Implemented",
      });
    });

    it("Returns a standard security headers", async () => {
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
