import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders } from "./utils/apiTestData";
import { expect, it, describe, beforeAll } from "vitest";

describe("POST /async/authSourceCheck", () => {
  describe("Given arbitrary request body", () => {
    let response: AxiosResponse;

    beforeAll(async () => {
      const requestBody = { unused: "unused" };

      response = await SESSIONS_API_INSTANCE.post(
        "/async/authSourceCheck",
        requestBody,
      );
    });

    it("Returns an error and 501 status code", async () => {
      expect(response.status).toBe(501);
      expect(response.statusText).toBe("Not Implemented");
      expect(response.data).toStrictEqual({
        error: "Not Implemented",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
