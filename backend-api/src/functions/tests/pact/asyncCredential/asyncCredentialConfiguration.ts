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

const defaultPassingDependencies = {
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
  clientRegistryService: () =>
    new MockClientRegistryServiceGetPartialClientSuccessResultIPV(),
  tokenService: () => new MockTokenServiceSuccessIPV(),
  sessionService: (sessionTableName: string, sessionIndexName: string) =>
    new MockSessionServiceCreateSessionSuccessResult(
      sessionTableName,
      sessionIndexName,
    ),
};

export class AsyncCredentialConfiguration {
  dependencies = defaultPassingDependencies;

  setValidAccessToken() {
    this.dependencies = defaultPassingDependencies;
  }

  setInvalidAccessToken() {
    this.dependencies = {
      ...defaultPassingDependencies,
      tokenService: () => new MockTokenServiceInvalidSignatureIPV(),
    };
  }
}

export const asyncCredentialConfig = new AsyncCredentialConfiguration();
