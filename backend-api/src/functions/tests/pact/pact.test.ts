import { Application } from "express";
import { createApp } from "./createApp";
import { Verifier } from "@pact-foundation/pact";
import path from "path";
import { stateConfig } from "./stateConfiguration";
import {
  MockRequestServiceSuccessResult,
  MockTokenServiceSuccessResult,
  MockClientRegistryServiceBadRequestResult,
  MockClientRegistryServiceSuccessResult,
} from "../../asyncToken/asyncTokenHandler.test";
import { MockEventWriterSuccess } from "../../services/events/tests/mocks";
import { MockLoggingAdapter } from "../../services/logging/tests/mockLogger";
import { Logger } from "../../services/logging/logger";
import { registeredLogs } from "../../asyncToken/registeredLogs";
import { Server } from "http";

describe("Provider API contract verification", () => {
  const port: number = 2025;
  let app: Application;
  let server: Server;
  const env = {
    SIGNING_KEY_ID: "mockSigningKeyId",
    ISSUER: "mockIssuer",
    SQS_QUEUE: "mockSQSQueue",
    CLIENT_REGISTRY_PARAMETER_NAME: "mockRegistryParameterName",
  };

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
        stateConfig.dependenciesValue = {
          env,
          eventService: () => new MockEventWriterSuccess(),
          logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
          requestService: () => new MockRequestServiceSuccessResult(),
          clientRegistryService: () =>
            new MockClientRegistryServiceBadRequestResult(),
          tokenService: () => new MockTokenServiceSuccessResult(),
        };
        return Promise.resolve("State set for invalid basic auth secret");
      },
      "dummySecret is a valid basic auth secret": () => {
        stateConfig.dependenciesValue = {
          env,
          eventService: () => new MockEventWriterSuccess(),
          logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
          requestService: () => new MockRequestServiceSuccessResult(),
          clientRegistryService: () =>
            new MockClientRegistryServiceSuccessResult(),
          tokenService: () => new MockTokenServiceSuccessResult(),
        };
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
