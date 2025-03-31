import { AxiosResponse } from "axios";
import { TEST_RESOURCES_API_INSTANCE } from "../utils/apiInstances";
import { expectedSecurityHeaders } from "../utils/apiTestData";

describe("PUT /sessions/{sessionId}", () => {
  describe("Given there is no sessionId path parameter", () => {
    let response: AxiosResponse;
    beforeEach(async () => {
      response = await TEST_RESOURCES_API_INSTANCE.put("/sessions", {});
    });
    // note: this validation is done by the API gateway. It treats a missing path parameter as an unknown API gateway method.
    it("Returns a 404 Not Found response", async () => {
      expect(response.data).toEqual({
        message: "No method found matching route sessions for http method PUT.",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("Given there is a valid sessionId parameter", () => {
    let response: AxiosResponse;
    beforeEach(async () => {
      response = await TEST_RESOURCES_API_INSTANCE.put("/sessions/1", {});
    });
    it("Returns a 501 Not Implemented response", async () => {
      expect(response.data).toEqual("Not Implemented");
      expect(response.status).toBe(501);
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});
