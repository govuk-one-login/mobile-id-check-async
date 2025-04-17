import { randomUUID } from "crypto";
import "dotenv/config";
import {
  SESSIONS_API_INSTANCE,
  TEST_RESOURCES_API_INSTANCE,
} from "../utils/apiInstances";
import {
  createSession,
  CredentialResultResponse,
  getActiveSessionId,
  pollForCredentialResults,
} from "../utils/testFunctions";

const ONE_SECOND = 1000;
jest.setTimeout(45 * ONE_SECOND);

describe("GET /credentialResult", () => {
  describe("Given there are no credential results to dequeue", () => {
    it("Returns a 404 Not Found response", async () => {
      const params = {
        pk: "SUB%23mockSub",
      };
      const response = await TEST_RESOURCES_API_INSTANCE.get(
        "/credentialResult",
        { params },
      );

      expect(response.status).toBe(404);
      expect(response.statusText).toStrictEqual("Not Found");
    });
  });

  describe("Given there are credential results to dequeue", () => {
    describe("Given the request query is not valid", () => {
      it("Returns a 400 Bad Request response", async () => {
        const params = {
          invalidKey: `SUB%23mockSub`,
        };
        const response = await TEST_RESOURCES_API_INSTANCE.get(
          "/credentialResult",
          {
            params,
          },
        );

        expect(response.status).toBe(400);
        expect(response.statusText).toEqual("Bad Request");
      });
    });

    describe("Given the request query is valid", () => {
      let sub: string;
      let sessionId: string;
      let response: CredentialResultResponse;

      beforeEach(async () => {
        sub = randomUUID();
        await createSession(sub);
        sessionId = await getActiveSessionId(sub);
        await SESSIONS_API_INSTANCE.post("/async/abortSession", {
          sessionId,
        });
        const pk = `SUB#${sub}`;
        response = (await pollForCredentialResults(pk, 1))[0];
      });

      it("Returns a 200 OK response", async () => {
        expect(response.pk).toEqual(`SUB#${sub}`);
        expect(response.sk).toEqual(expect.stringContaining("SENT_TIMESTAMP#"));
        expect(response.body).toEqual({
          error: "access_denied",
          error_description: "User aborted the session",
          state: "testState",
          sub,
        });
      });
    });
  });
});
