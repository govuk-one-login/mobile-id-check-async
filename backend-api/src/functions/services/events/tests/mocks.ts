import {
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../../utils/result";
import {
  GenericEventConfig,
  IEventService,
  CredentialTokenIssuedEventConfig,
  EventNames,
} from "../types";

export class MockEventWriterSuccess implements IEventService {
  auditEvents: EventNames[] = [];

  writeGenericEvent = async (
    eventConfig: GenericEventConfig,
  ): Promise<Result<null>> => {
    this.auditEvents.push(eventConfig.eventName);
    return successResult(null);
  };

  writeCredentialTokenIssuedEvent = async (
    eventConfig: CredentialTokenIssuedEventConfig,
  ): Promise<Result<null>> => {
    this.auditEvents.push(eventConfig.eventName);
    return successResult(null);
  };
}

export class MockEventServiceFailToWrite implements IEventService {
  private eventNameToFail: EventNames;

  constructor(eventNameToFail: EventNames) {
    this.eventNameToFail = eventNameToFail;
  }

  writeGenericEvent = async (
    eventConfig: GenericEventConfig,
  ): Promise<Result<null>> => {
    if (eventConfig.eventName === this.eventNameToFail)
      return errorResult({
        errorMessage: "Error writing to SQS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    return successResult(null);
  };

  writeCredentialTokenIssuedEvent = async (): Promise<Result<null>> => {
    return errorResult({
      errorMessage: "Error writing to SQS",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  };

  writeBiometricTokenIssuedEvent = async (): Promise<Result<null>> => {
    return errorResult({
      errorMessage: "Failed to write to SQS",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  };
}
