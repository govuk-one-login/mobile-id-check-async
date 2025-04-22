import { randomUUID } from "crypto";
import "dotenv/config";
import {
  SESSIONS_API_INSTANCE,
  TEST_RESOURCES_API_INSTANCE,
} from "../utils/apiInstances";
import { createSession, getActiveSessionId } from "../utils/testFunctions";
import { AxiosResponse } from "axios";

const ONE_SECOND = 1000;
jest.setTimeout(45 * ONE_SECOND);

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

  describe("Given there is a credential result to dequeue", () => {
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

export type CredentialResultResponse = {
  pk: string;
  sk: string;
  body: object;
};

function isValidCredentialResultResponse(
  credentialResultResponse: unknown,
): credentialResultResponse is CredentialResultResponse {
  return (
    typeof credentialResultResponse === "object" &&
    credentialResultResponse !== null &&
    "pk" in credentialResultResponse &&
    typeof credentialResultResponse.pk === "string" &&
    "sk" in credentialResultResponse &&
    typeof credentialResultResponse.sk === "string" &&
    "body" in credentialResultResponse &&
    typeof credentialResultResponse.body === "object"
  );
}

export async function pollForCredentialResults(
  partitionKey: string,
  numberOfResults: number,
): Promise<CredentialResultResponse[]> {
  async function wait(delayMillis: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMillis));
  }

  function currentTime() {
    return Date.now();
  }

  function calculateExponentialBackoff(attempts: number) {
    return Math.min(2 ** attempts * INITIAL_DELAY_MILLIS, MAX_BACKOFF_MILLIS);
  }

  const POLLING_DURATION_MILLIS = 40000; // maximum time to poll API
  const MAX_BACKOFF_MILLIS = 10000; // maximum wait time between API calls
  const INITIAL_DELAY_MILLIS = 500; // initial wait time before calling API

  const pollEndTime = currentTime() + POLLING_DURATION_MILLIS;

  let credentialResults: unknown[] = [];
  let attempts = 0;
  let waitTime = 0;

  while (
    credentialResults.length < numberOfResults &&
    currentTime() + waitTime < pollEndTime
  ) {
    await wait(waitTime);
    credentialResults = await getCredentialResult(partitionKey);

    waitTime = calculateExponentialBackoff(attempts++);
  }

  if (credentialResults.length < numberOfResults)
    throw new Error(
      `Only found ${credentialResults.length} results for pk=${partitionKey}. Expected to find at least ${numberOfResults} result(s).`,
    );

  if (
    credentialResults.some(
      (credentialResult) => !isValidCredentialResultResponse(credentialResult),
    )
  )
    throw new Error("Response from /credentialResult is malformed");

  return credentialResults as CredentialResultResponse[];
}

// Calls /credentialResult API
async function getCredentialResult(partitionKey: string): Promise<unknown[]> {
  const response = await TEST_RESOURCES_API_INSTANCE.get("credentialResult", {
    params: {
      pk: partitionKey,
    },
  });

  const credentialResults = response.data;
  return Array.isArray(credentialResults) ? credentialResults : []; // If response is malformed, return empty array so polling can be retried
}
