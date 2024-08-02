import { Application } from "express";
import { createApp } from "./createApp";
import { Verifier } from "@pact-foundation/pact";
import path from "path";
import { stateConfig } from "./stateConfiguration";

describe("Provider API contract verification", () => {
  const port: number = 2025;
  let app: Application;
  let server: any;

  beforeAll(async () => {
    app = await createApp();

    server = app.listen(port, () => {
      console.log(`Server listening on port ${port}.`);
    });
  });

  afterAll(() => {
    server.close();
  });

  it("validates adherence to all consumer contracts", () => {
    const stateHandlers: any = {
      "badDummySecret is not a valid basic auth secret": () => {
        stateConfig.secret = "badDummySecret";
        return Promise.resolve("State set for invalid basic auth secret");
      },
    };

    const verifier = new Verifier({
      provider: "DcmawCriProvider",
      logLevel: "info",
      pactUrls: [
        path.resolve(
          process.cwd(),
          "functions/tests/pact/pactFiles/IpvCoreBack-DcmawCriProvider.json",
        ),
      ],
      stateHandlers,
      providerBaseUrl: `http://localhost:${port}`,
    });

    // Return the promise to Jest
    return verifier
      .verifyProvider()
      .then((output) => {
        console.log(output);
      })
      .catch((error) => {
        console.error("Failed to verify pacts", error);
        throw error; // Rethrow to ensure Jest marks the test as failed
      });
  });
});
