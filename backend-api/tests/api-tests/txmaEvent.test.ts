import { AxiosResponse } from "axios";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import { expectedSecurityHeaders } from "./utils/apiTestData";
import { getValidSessionId } from "./utils/apiTestHelpers";

describe("POST /async/txmaEvent", () => {
  describe("Given there is a valid request", () => {
    let sessionId: string | null;
    let biometricTokenResponse: AxiosResponse;

    beforeAll(async () => {
      sessionId = await getValidSessionId();
      if (!sessionId)
        throw new Error(
          "Failed to get valid session ID to call biometricToken endpoint",
        );

      const requestBody = {
        sessionId,
        eventName: "DCMAW_READID_NFC_BILLING_STARTED",
      };

      biometricTokenResponse = await SESSIONS_API_INSTANCE.post(
        "/async/txmaEvent",
        requestBody,
      );
    }, 20000);

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
