import { Application } from "express";
import { createApp } from "./createApp";
import { Verifier } from "@pact-foundation/pact";
import { Server } from "http";
import { asyncTokenDependencies } from "./dependencies/asyncTokenDependencies";
import { asyncCredentialDependencies } from "./dependencies/asyncCredentialDependencies";
import { execSync } from "child_process";
import axios from "axios";

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

  it("validates adherence to all consumer contracts", async () => {
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

    const response = await axios.post(
      `http://localhost:${port}/async/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: "Basic aXB2LWNvcmU6ZHVtbXlTZWNyZXQ=",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    console.log(response.status);
    console.log(response.data);

    const verifier = new Verifier({
      consumerVersionSelectors: [
        {
          mainBranch: true,
        },
      ],
      logLevel: "trace",
      pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
      provider: "DcmawAsyncCriProvider",
      providerBaseUrl: `http://localhost:${port}`,
      providerVersion: process.env.GITHUB_SHA || "local-dev",
      providerVersionBranch: getProviderBranchName(),
      publishVerificationResult:
        process.env.PUBLISH_PACT_VERIFICATION_RESULTS === "true",
      stateHandlers,
      requestFilter: (req, _res, next) => {
        req.headers["content-length"] = JSON.stringify(
          req.body,
        ).length.toString();
        next();
      },
    });

    return verifier
      .verifyProvider()
      .then((output) => {
        console.log(output);
      })
      .catch((error) => {
        console.error("Failed to verify pacts", error);
        throw error;
      });
  });
});

const getProviderBranchName = (): string => {
  return (
    process.env.GIT_BRANCH ||
    execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
  );
};
