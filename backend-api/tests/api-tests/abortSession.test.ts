import { AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import {
  SESSIONS_API_INSTANCE,
  TEST_RESOURCES_API_INSTANCE,
} from "./utils/apiInstance";
import {
  expectedSecurityHeaders,
  mockInvalidUUID,
  mockSessionId,
} from "./utils/apiTestData";
import {
  createSessionForSub,
  EventResponse,
  getActiveSessionIdFromSub,
  pollForEvents,
} from "./utils/apiTestHelpers";

describe("POST /async/abortSession", () => {
  describe("Given the request body is invalid", () => {
    let response: AxiosResponse;
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId: mockInvalidUUID,
      });
    });

    it("Returns 400 Bad Request response with invalid_request error", async () => {
      expect(response.status).toBe(400);
      expect(response.statusText).toBe("Bad Request");
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: `sessionId in request body is not a valid v4 UUID. sessionId: ${mockInvalidUUID}`,
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given the session does not exist", () => {
    let response: AxiosResponse;
    const nonExistentSessionId = mockSessionId;
    beforeAll(async () => {
      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId: nonExistentSessionId,
      });
    });

    it("Returns 401 Unauthorized response with invalid_session error", () => {
      expect(response.status).toBe(401);
      expect(response.statusText).toBe("Unauthorized");
      expect(response.data).toStrictEqual({
        error: "invalid_session",
        error_description: "Session not found",
      });
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });

  describe("Given there is a valid request", () => {
    let sub: string;
    let sessionId: string;
    let response: AxiosResponse;

    beforeAll(async () => {
      sub = randomUUID();
      await createSessionForSub(sub);
      sessionId = await getActiveSessionIdFromSub(sub);

      response = await SESSIONS_API_INSTANCE.post("/async/abortSession", {
        sessionId,
      });
    }, 30000);

    describe("Given the abort session message is sent to the IPV Core outbound queue", () => {
      let credentialResultsResponse: CredentialResultResponse[];

      beforeAll(async () => {
        credentialResultsResponse = await pollForCredentialResults(
          `SUB#${sub}`,
          1,
        );
      }, 40000);

      it("Writes the abort session message", () => {
        expect(credentialResultsResponse[0].body).toEqual(
          expect.objectContaining({
            sub,
            state: "testState",
            error: "access_denied",
            error_description: "User aborted the session",
          }),
        );
      });
    });

    describe("Given the TxMA event is sent to TxMA", () => {
      let eventsResponse: EventResponse[];

      beforeAll(async () => {
        eventsResponse = await pollForEvents({
          partitionKey: `SESSION#${sessionId}`,
          sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_ABORT_APP`,
          numberOfEvents: 1,
        });
      }, 40000);

      it("Writes DCMAW_ASYNC_ABORT_APP TxMA event", () => {
        expect(eventsResponse[0].event).toEqual(
          expect.objectContaining({
            event_name: "DCMAW_ASYNC_ABORT_APP",
          }),
        );
      });
    });

    it("Returns 200 Ok response", () => {
      expect(response.status).toBe(200);
      expect(response.headers).toEqual(
        expect.objectContaining(expectedSecurityHeaders),
      );
    });
  });
});

type CredentialResultResponse = {
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

async function pollForCredentialResults(
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
