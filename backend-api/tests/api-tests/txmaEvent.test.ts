import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders } from "./utils/apiTestData";

describe("POST /async/txmaEvent", () => {
  describe("Given there is a valid request", () => {
    let biometricTokenResponse: AxiosResponse;

    beforeAll(async () => {
      biometricTokenResponse =
        await SESSIONS_API_INSTANCE.post("/async/txmaEvent");
    });

    it("Returns 501 Not Implemented response", () => {
      expect(biometricTokenResponse.status).toBe(501);
      expect(biometricTokenResponse.data).toStrictEqual({
        error: "Not Implemented",
      });
      expect(biometricTokenResponse.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
