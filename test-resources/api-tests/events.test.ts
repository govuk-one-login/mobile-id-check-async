import { randomUUID } from "crypto";
import "dotenv/config";
import {
  createSession,
  EVENTS_API_INSTANCE,
  getActiveSessionId,
  pollForEvents,
} from "./utils/apiTestHelpers";

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
      let sub: string;
      let sessionId: string;

      beforeEach(async () => {
        await createSession();
        sub = randomUUID();
        sessionId = await getActiveSessionId(sub);
      });

      it("Returns a 200 OK response", async () => {
        const params = {
          pkPrefix: `SESSION#${sessionId}`,
          skPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_START`,
        };

        const { pkPrefix, skPrefix } = params;
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
