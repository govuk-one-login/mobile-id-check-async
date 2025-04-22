import { randomUUID } from "crypto";
import "dotenv/config";
import { createSession, getActiveSessionId } from "../utils/testFunctions";
import { EVENTS_API_INSTANCE } from "../utils/apiInstances";

const ONE_SECOND = 1000;
jest.setTimeout(45 * ONE_SECOND);

describe("GET /events", () => {
  describe("Given there are no events to dequeue", () => {
    it("Returns a 404 Not Found response", async () => {
      const params = {
        pkPrefix: `SESSION%23`,
        skPrefix: `TXMA%23EVENT_NAME%23DCMAW_ASYNC_CRI_START`,
      };
      const response = await EVENTS_API_INSTANCE.get("/events", { params });

      expect(response.status).toBe(404);
      expect(response.statusText).toStrictEqual("Not Found");
    });
  });

  describe("Given there are events to dequeue", () => {
    describe("Given a request is made with a query that is not valid", () => {
      it("Returns a 400 Bad Request response", async () => {
        const params = {
          skPrefix: `TXMA%23EVENT_NAME%23DCMAW_ASYNC_CRI_START`,
        };
        const response = await EVENTS_API_INSTANCE.get("/events", {
          params,
        });

        expect(response.status).toBe(400);
        expect(response.statusText).toEqual("Bad Request");
      });
    });

    describe("Given a request is made with a query that is valid", () => {
      let sessionId: string;

      beforeEach(async () => {
        const sub = randomUUID();
        await createSession(sub);
        sessionId = await getActiveSessionId(sub);
      });

      it("Returns a 200 OK response", async () => {
        const pkPrefix = `SESSION#${sessionId}`;
        const skPrefix = `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_START`;

        const response = (await pollForEvents(pkPrefix, skPrefix, 1))[0];

        expect(response.pk).toEqual(`SESSION#${sessionId}`);
        expect(response.sk).toEqual(
          expect.stringContaining(
            "TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_START#TIMESTAMP#",
          ),
        );
        expect(response.event).toEqual(
          expect.objectContaining({
            event_name: "DCMAW_ASYNC_CRI_START",
          }),
        );
      });
    });
  });
});

type EventResponse = {
  pk: string;
  sk: string;
  event: object;
};

function isValidEventResponse(
  eventResponse: unknown,
): eventResponse is EventResponse {
  return (
    typeof eventResponse === "object" &&
    eventResponse !== null &&
    "pk" in eventResponse &&
    typeof eventResponse.pk === "string" &&
    "sk" in eventResponse &&
    typeof eventResponse.sk === "string" &&
    "event" in eventResponse &&
    typeof eventResponse.event === "object"
  );
}

export async function pollForEvents(
  partitionKey: string,
  sortKeyPrefix: string,
  numberOfEvents: number,
): Promise<EventResponse[]> {
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

  let events: unknown[] = [];
  let attempts = 0;
  let waitTime = 0;

  while (
    events.length < numberOfEvents &&
    currentTime() + waitTime < pollEndTime
  ) {
    await wait(waitTime);
    events = await getEvents(partitionKey, sortKeyPrefix);

    waitTime = calculateExponentialBackoff(attempts++);
  }

  if (events.length < numberOfEvents)
    throw new Error(
      `Only found ${events.length} events for pkPrefix=${partitionKey} and skPrefix=${sortKeyPrefix}. Expected to find at least ${numberOfEvents} events.`,
    );

  if (events.some((event) => !isValidEventResponse(event)))
    throw new Error("Response from /events is malformed");

  return events as EventResponse[];
}

// Call /events API
async function getEvents(
  partitionKey: string,
  sortKeyPrefix: string,
): Promise<unknown[]> {
  const response = await EVENTS_API_INSTANCE.get("events", {
    params: {
      pkPrefix: partitionKey,
      skPrefix: sortKeyPrefix,
    },
  });

  const events = response.data;
  return Array.isArray(events) ? events : []; // If response is malformed, return empty array so polling can be retried
}
