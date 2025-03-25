import { TEST_SESSIONS_API_INSTANCE } from "../dequeue/utils/apiTestHelpers";

describe("Test Sessions api tests", () => {
  it("Returns a 400 with validation reason if request fails api validation", async () => {
    const response = await TEST_SESSIONS_API_INSTANCE.put("/session", {});
    console.log(response);
    expect(response.status).toBe(400);
    expect(response.data).toEqual({
      error:
        '[object has missing required properties (["clientId","clientState","createdAt","govukSigninJourneyId","issuer","sessionId","sessionState","subjectIdentifier","timeToLive"])]',
      message: "Invalid request body",
    });
  });

  it("Returns a 201 Created if validation passes", async () => {
    const validSession = {
      sessionId: crypto.randomUUID(),
      sessionState: "ASYNC_AUTH_SESSION_CREATED",
      clientState: "mockClientState",
      govukSigninJourneyId: "mockJourneyId",
      subjectIdentifier: crypto.randomUUID(),
      clientId: "mockClientId",
      issuer: "mockIssuer",
      createdAt: Date.now(),
      timeToLive: Date.now() + 3600000,
    };

    const response = await TEST_SESSIONS_API_INSTANCE.put(
      "/session",
      validSession,
    );
    expect(response.data).toEqual({});
    expect(response.status).toBe(201);
    expect(response.statusText).toBe("Created");
  });
});
