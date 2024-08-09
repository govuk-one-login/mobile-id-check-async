import { registeredLogs } from "../../../asyncToken/registeredLogs";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLogger";
import { Logger } from "../../../services/logging/logger";
import {
  MockClientRegistryServiceBadRequestResult,
  MockClientRegistryServiceSuccessResult,
  MockTokenServiceSuccessResult,
} from "../../../testUtils/asyncTokenMocks";
import { IAsyncTokenRequestDependencies } from "../../../asyncToken/handlerDependencies";

export class AsyncTokenConfiguration {
  secret: string = "";
  dependencies: IAsyncTokenRequestDependencies = {
    env: {
      SIGNING_KEY_ID: "mockSigningKeyId",
      ISSUER: "mockIssuer",
      SQS_QUEUE: "mockSQSQueue",
      CLIENT_REGISTRY_PARAMETER_NAME: "mockRegistryParameterName",
    },
    eventService: () => new MockEventWriterSuccess(),
    logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
    clientRegistryService: () => new MockClientRegistryServiceSuccessResult(),
    tokenService: () => new MockTokenServiceSuccessResult(),
  };

  get dependenciesValue() {
    return this.dependencies;
  }

  set dependenciesValue(value: IAsyncTokenRequestDependencies) {
    this.dependencies = value;
  }

  setClientRegistryServiceBadRequestResult() {}

  setDependencies(scenario?: AsyncTokenTestScenarios) {
    switch (scenario) {
      case "INVALID_CLIENT_SECRETS":
        this.dependencies.clientRegistryService = () =>
          new MockClientRegistryServiceBadRequestResult();
        break;
      default:
        this.dependencies = {
          env: {
            SIGNING_KEY_ID: "mockSigningKeyId",
            ISSUER: "mockIssuer",
            SQS_QUEUE: "mockSQSQueue",
            CLIENT_REGISTRY_PARAMETER_NAME: "mockRegistryParameterName",
          },
          eventService: () => new MockEventWriterSuccess(),
          logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
          clientRegistryService: () =>
            new MockClientRegistryServiceSuccessResult(),
          tokenService: () => new MockTokenServiceSuccessResult(),
        };
    }
  }
}

type AsyncTokenTestScenarios = "INVALID_CLIENT_SECRETS";

export const asyncTokenConfig = new AsyncTokenConfiguration();
