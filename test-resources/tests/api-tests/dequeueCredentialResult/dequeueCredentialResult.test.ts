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
import { AxiosResponse } from "axios";

const ONE_SECOND = 1000;
jest.setTimeout(50 * ONE_SECOND);

describe("GET /credentialResult", () => {
  describe("Given the request query is not valid", () => {
    let response: AxiosResponse;

    beforeEach(async () => {
      const params = {
        invalidKey: `SUB%23mockSub`,
      };
      response = await TEST_RESOURCES_API_INSTANCE.get("/credentialResult", {
        params,
      });
    });

    it("Returns a 400 Bad Request response", async () => {
      expect(response.status).toBe(400);
      expect(response.statusText).toEqual("Bad Request");
    });
  });

  describe("Given there are no credential results to dequeue", () => {
    let response: AxiosResponse;

    beforeEach(async () => {
      const params = {
        pk: "SUB%23mockSub",
      };
      response = await TEST_RESOURCES_API_INSTANCE.get("/credentialResult", {
        params,
      });
    });

    it("Returns a 404 Not Found response", async () => {
      expect(response.status).toBe(404);
      expect(response.statusText).toStrictEqual("Not Found");
    });
  });

  describe("Given there is a credential results to dequeue", () => {
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

  describe("Given there are multiple credential results for the same sub to dequeue", () => {
    let sub: string;
    let sessionId: string;
    let response: CredentialResultResponse[];

    beforeAll(async () => {
      sub = randomUUID();
      await createSession(sub);
      sessionId = await getActiveSessionId(sub);
      await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId,
      });
      await createSession(sub);
      sessionId = await getActiveSessionId(sub);
      await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId,
      });
      const pk = `SUB#${sub}`;
      response = await pollForCredentialResults(pk, 2);
    });

    it.each([
      ["first", 0],
      ["second", 1],
    ])(
      "Returns the %s credential result",
      (position, credentialResultsIndex) => {
        expect(response[credentialResultsIndex].pk).toEqual(`SUB#${sub}`);
        expect(response[credentialResultsIndex].sk).toEqual(
          expect.stringContaining("SENT_TIMESTAMP#"),
        );
        expect(response[credentialResultsIndex].body).toEqual({
          error: "access_denied",
          error_description: "User aborted the session",
          state: "testState",
          sub,
        });
      },
    );
  });
});
