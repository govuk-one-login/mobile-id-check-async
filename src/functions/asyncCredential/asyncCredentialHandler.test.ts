import { lambdaHandler } from "./asyncCredentialHandler";

describe("Async Credential", () => {
  it('Returns with 200 response with a body of "Hello World"', async () => {
    const result = await lambdaHandler();

    expect(result.statusCode);
    expect(result.body).toEqual(
      JSON.stringify({
        message: "Hello World",
      }),
    );
  });
});
