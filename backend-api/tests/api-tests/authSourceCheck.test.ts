import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders } from "./utils/apiTestData";
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
          "opaqueId in request body is either null or undefined.",
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
      const requestBody = {
        sessionId: "fe4b8e97-fe75-4a61-b85e-f0a2c5cea446",
        opaqueId: "4c5f83fc-4fae-41bf-88f9-03730119c77f",
        userSurname: "DECERQUEIRA",
        userForenames: ["KENNETH"],
        userDateOfBirth: "1965-07-08",
        validFrom: "2018-01-01",
        validUntil: "2027-12-31",
        issuingAuthority: "DVLA",
        licenceNumber: "DECER607085K912305",
        postcode: "BA2 5AA",
      };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/authSourceCheck",
        requestBody,
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
