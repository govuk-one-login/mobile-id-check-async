import { AxiosResponse } from "axios";
import { randomUUID } from "crypto";
import { SESSIONS_API_INSTANCE } from "./utils/apiInstance";
import {
  createSessionForSub,
  EventResponse,
  getAccessToken,
  getActiveSessionIdFromSub,
  pollForEvents,
} from "./utils/apiTestHelpers";
import { generateRandomString, mockClientState } from "./utils/apiTestData";

jest.setTimeout(4 * 5000);

describe("GET /async/activeSession", () => {
  describe("Given there is no Authorization header", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession");

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header",
      });
    });
  });

  describe("Given the Authorization header does not start with Bearer", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Basic " },
      });

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header",
      });
    });
  });

  describe("Given the Bearer token from the Authorization header is missing the token", () => {
    it("Returns an error and 401 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer " },
      });

      expect(response.status).toBe(401);
      expect(response.data).toStrictEqual({
        error: "unauthorized",
        error_description: "Invalid authorization header",
      });
    });
  });

  describe("Given the service token JWE does not consist of 5 parts", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer one.two.three.four" },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given there is an error decrypting the content encryption key (CEK)", () => {
    it("Returns an error and 400 status code", async () => {
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: "Bearer one.two.three.four.five" },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given there is an error decrypting the service token because the authentication tag is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const accessTokenWithInvalidTag = (await getAccessToken()) + "invalidTag";
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessTokenWithInvalidTag}` },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given service token validation fails because the scope is invalid", () => {
    it("Returns an error and 400 status code", async () => {
      const sub = randomUUID();
      const accessToken = await getAccessToken(sub, "invalid.scope");
      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(400);
      expect(response.data).toStrictEqual({
        error: "invalid_request",
        error_description: "Failed to decrypt service token",
      });
    });
  });

  describe("Given active session is not found", () => {
    it("Returns an error and 404 status code", async () => {
      const accessToken = await getAccessToken();

      const response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(404);
      expect(response.data).toStrictEqual({
        error: "session_not_found",
        error_description:
          "No active session found for the given sub identifier",
      });
    });
  });

  describe("Given the request is valid and a session is found", () => {
    let sub: string;
    let govukSigninJourneyId: string;
    let response: AxiosResponse;
    let eventsResponse: EventResponse[];

    beforeAll(async () => {
      sub = randomUUID();
      govukSigninJourneyId = generateRandomString();
      await createSessionForSub(sub, govukSigninJourneyId);
      const accessToken = await getAccessToken(sub);
      const sessionId = await getActiveSessionIdFromSub(sub);

      response = await SESSIONS_API_INSTANCE.get("/async/activeSession", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      eventsResponse = await pollForEvents({
        partitionKey: `SESSION#${sessionId}`,
        sortKeyPrefix: `TXMA#EVENT_NAME#DCMAW_ASYNC_CRI_APP_START`,
        numberOfEvents: 1,
      });
    }, 40000);

    it("Writes an event with the correct event_name", async () => {
      expect(eventsResponse[0].event).toStrictEqual({
        event_name: "DCMAW_ASYNC_CRI_APP_START",
        component_id: `https://review-b-async.${process.env.TEST_ENVIRONMENT}.account.gov.uk`,
        timestamp: expect.any(Number),
        event_timestamp_ms: expect.any(Number),
        user: {
          govuk_signin_journey_id: govukSigninJourneyId,
          session_id: response.data.sessionId,
          user_id: sub,
          ip_address: expect.any(String),
        },
        extensions: {
          redirect_uri: "https://mockRedirectUri.com",
        },
        restricted: { device_information: { encoded: expect.any(String) } },
      });
    });

    it("Returns 200 status code, sessionId, redirectUri and state", async () => {
      expect(response.status).toBe(200);
      expect(response.data["sessionId"]).toBeDefined();
      expect(response.data["redirectUri"]).toBe("https://mockRedirectUri.com");
      expect(response.data["state"]).toBe(mockClientState);
    });
  });

  describe("Given the request is valid and there are two sessions with the requested subject ID", () => {
    it("Returns the latest session", async () => {
      const sub = randomUUID();
      const accessToken = await getAccessToken(sub);

      await createSessionForSub(sub);
      const firstResponse = await SESSIONS_API_INSTANCE.get(
        "/async/activeSession",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      await createSessionForSub(sub);
      const secondResponse = await SESSIONS_API_INSTANCE.get(
        "/async/activeSession",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      expect(firstResponse.data["sessionId"]).not.toEqual(
        secondResponse.data["sessionId"],
      );
    });
  });
});
