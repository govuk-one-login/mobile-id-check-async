import { Application } from "express";
import { createApp } from "./createApp";
import { Verifier } from "@pact-foundation/pact";
import path from "path";
import { asyncTokenConfig } from "./asyncToken/asyncTokenConfiguration";
import { Server } from "http";
import { requestService } from "../../asyncToken/requestService/requestService";
import { successResult } from "../../utils/result";
import { asyncCredentialConfig } from "./asyncCredential/asyncCredentialConfiguration";

jest.setTimeout(60000);
describe("Provider API contract verification", () => {
  let app: Application;
  let server: Server;
  const port = 2025;

  beforeAll(async () => {
    app = await createApp();

    server = app.listen(port, () => {
      console.log(`Server listening on port ${port}.`);
    });

    jest
      .spyOn(requestService, "validateBody")
      .mockImplementation(() => successResult(null));
    jest.spyOn(requestService, "getClientCredentials").mockImplementation(() =>
      successResult({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
      }),
    );
  });

  afterAll(() => {
    server.close();
    jest.clearAllMocks();
  });

  it("validates adherence to all consumer contracts", () => {
    const stateHandlers = {
      "badDummySecret is not a valid basic auth secret": () => {
        asyncTokenConfig.setInvalidAuthHeader();
        return Promise.resolve("State set for invalid basic auth secret");
      },
      "dummySecret is a valid basic auth secret": () => {
        asyncTokenConfig.setValidAuthHeader();
        return Promise.resolve("dummySecret is a valid basic auth secret");
      },
      "dummyAccessToken is a valid access token": () => {
        asyncCredentialConfig.setDependenciesByScenario(
          "dummyAccessToken is a valid access token",
        );
        return Promise.resolve("dummyAccessToken is a valid access token");
      },
      "badAccessToken is not a valid access token": () => {
        asyncCredentialConfig.setDependenciesByScenario(
          "badAccessToken is not a valid access token",
        );
        return Promise.resolve("State set for invalid access token");
      },
    };

    const verifier = new Verifier({
      provider: "DcmawAsyncCriProvider",
      logLevel: "info",
      pactUrls: [
        path.resolve(
          process.cwd(),
          "src/functions/tests/pact/pactFiles/IpvCoreBack-DcmawAsyncCriProvider.json",
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
