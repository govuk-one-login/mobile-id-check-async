import { Dependencies } from "../../../asyncCredential/handlerDependencies";
import { registeredLogs } from "../../../asyncCredential/registeredLogs";
import { MockEventWriterSuccess } from "../../../services/events/tests/mocks";
import { Logger } from "../../../services/logging/logger";
import { MockLoggingAdapter } from "../../../services/logging/tests/mockLogger";
import { MockClientRegistryServiceGetPartialClientSuccessResult, MockSessionServiceCreateSessionSuccessResult, MockTokenServiceSuccessIPV } from "../../../testUtils/asyncCredentialMocks";

const env = {
  SIGNING_KEY_ID: "mockKid",
  ISSUER: "mockIssuer",
  SESSION_TABLE_NAME: "mockTableName",
  SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: "mockIndexName",
  SESSION_TTL_IN_MILLISECONDS: "12345",
  SQS_QUEUE: "mockSqsQueue",
  CLIENT_REGISTRY_PARAMETER_NAME: "mockParmaterName",
}

export class AsyncCredentialStateConfiguration {
  secret: string = "";
  dependencies: Dependencies = {
    env,
    eventService: () => new MockEventWriterSuccess(),
    logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
    clientRegistryService: () => new MockClientRegistryServiceGetPartialClientSuccessResult(),
    tokenService: () => new MockTokenServiceSuccessIPV(),
    sessionService: () => new MockSessionServiceCreateSessionSuccessResult(env.SESSION_TABLE_NAME, env.SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME),
  };

  get dependenciesValue() {
    return this.dependencies;
  }

  set dependenciesValue(value: Dependencies) {
    this.dependencies = value;
  }

  resetToPassingDependencies() {
    this.dependencies = {
      env: {
        SIGNING_KEY_ID: "mockKid",
        ISSUER: "mockIssuer",
        SESSION_TABLE_NAME: "mockTableName",
        SESSION_TABLE_SUBJECT_IDENTIFIER_INDEX_NAME: "mockIndexName",
        SESSION_TTL_IN_MILLISECONDS: "12345",
        SQS_QUEUE: "mockSqsQueue",
        CLIENT_REGISTRY_PARAMETER_NAME: "mockParmaterName",
      },
      eventService: () => new MockEventWriterSuccess(),
      logger: () => new Logger(new MockLoggingAdapter(), registeredLogs),
      clientRegistryService: () => new MockClientRegistryServiceGetPartialClientSuccessResult(),
      tokenService: () => new MockTokenServiceSuccessIPV(),
      sessionService: () => new MockSessionServiceCreateSessionSuccessResult("mockTableName", "mockIndexName"),
    };
  }
}

export const asyncCredentialStateConfig = new AsyncCredentialStateConfiguration();
