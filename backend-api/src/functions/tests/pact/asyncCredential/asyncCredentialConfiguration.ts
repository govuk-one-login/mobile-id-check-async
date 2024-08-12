import { IAsyncCredentialDependencies } from "../../../asyncCredential/handlerDependencies";
import { registeredLogs } from "../../../asyncCredential/registeredLogs";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { Logger } from "../../../services/logging/logger";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLogger";
import {
  MockClientRegistryServiceGetPartialClientSuccessResultIPV,
  MockSessionServiceCreateSessionSuccessResult,
  MockTokenServiceInvalidSignatureIPV,
  MockTokenServiceSuccessIPV,
} from "../../../testUtils/asyncCredentialMocks";

const env = {
  SIGNING_KEY_ID: "mockKid",
  ISSUER: "mockIssuer",
  SESSION_TABLE_NAME: "mockTableName",
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: "mockIndexName",
  SESSION_TTL_IN_MILLISECONDS: "12345",
  SQS_QUEUE: "mockSqsQueue",
  CLIENT_REGISTRY_PARAMETER_NAME: "mockParmaterName",
};

export class AsyncCredentialConfiguration {
  secret: string = "";
  dependencies: IAsyncCredentialDependencies;

  constructor() {
    this.dependencies = this.getPassingDependencies();
  }

  setDependenciesByScenario(scenario?: AsyncCredentialTestScenario) {
    if (scenario === "badAccessToken is not a valid access token") {
      this.resetToPassingDependencies();
      this.dependencies.tokenService = () =>
        new MockTokenServiceInvalidSignatureIPV();
    }

    if (scenario === "dummyAccessToken is a valid access token") {
      this.resetToPassingDependencies();
    }
  }

  private getPassingDependencies() {
    return {
      env,
      eventService: () => new MockEventWriterSuccess(),
      logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
      clientRegistryService: () =>
        new MockClientRegistryServiceGetPartialClientSuccessResultIPV(),
      tokenService: () => new MockTokenServiceSuccessIPV(),
      sessionService: () =>
        new MockSessionServiceCreateSessionSuccessResult(
          env.SESSION_TABLE_NAME,
          env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME,
        ),
    };
  }

  private resetToPassingDependencies() {
    this.dependencies = this.getPassingDependencies();
  }
}

type AsyncCredentialTestScenario =
  | "badAccessToken is not a valid access token"
  | "dummyAccessToken is a valid access token";

export const asyncCredentialConfig = new AsyncCredentialConfiguration();
