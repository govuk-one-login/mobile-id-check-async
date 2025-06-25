import { Application } from "express";
import { createApp } from "./createApp";
import { Verifier } from "@pact-foundation/pact";
import { Server } from "http";
import { asyncTokenDependencies } from "./dependencies/asyncTokenDependencies";
import { asyncCredentialDependencies } from "./dependencies/asyncCredentialDependencies";
import "dotenv/config"; // TEMPORARY BEFORE I SET LOCALLY WITH SCRIPT

jest.setTimeout(30000);
describe("Provider API contract verification", () => {
  let app: Application;
  let server: Server;
  const port = 2025;

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
    const stateHandlers = {
      "badDummySecret is not a valid basic auth secret": () => {
        asyncTokenDependencies.setInvalidAuthHeader();
        return Promise.resolve(
          "badDummySecret is not a valid basic auth secret",
        );
      },
      "dummySecret is a valid basic auth secret": () => {
        asyncTokenDependencies.setValidAuthHeader();
        return Promise.resolve("dummySecret is a valid basic auth secret");
      },
      "dummyAccessToken is a valid access token": () => {
        asyncCredentialDependencies.setValidAccessToken();
        return Promise.resolve("dummyAccessToken is a valid access token");
      },
      "badAccessToken is not a valid access token": () => {
        asyncCredentialDependencies.setInvalidAccessToken();
        return Promise.resolve("badAccessToken is not a valid access token");
      },
      "access token is missing": () => {
        asyncCredentialDependencies.setMissingAccessToken();
        return Promise.resolve("access token is missing");
      },
    };

    const verifier = new Verifier({
      consumerVersionSelectors: [
        {
          mainBranch: true, // UNSURE WHAT WE WANT HERE
        },
      ],
      logLevel: "error",
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
      pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
      provider: "DcmawAsyncCriProvider",
      providerBaseUrl: `http://localhost:${port}`,
      providerVersion: process.env.GITHUB_SHA || "local-dev", // UPDATE
      publishVerificationResult: false, // UPDATE
      stateHandlers,
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
