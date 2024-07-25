import { errorResult, Result, successResult } from "../../../utils/result";
import {
  GenericEventConfig,
  IEventService,
  CredentialTokenIssuedEventConfig,
  EventNames,
} from "../eventService";

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
      return errorResult("Error writing to SQS");
    return successResult(null);
  };

  writeCredentialTokenIssuedEvent = async (): Promise<Result<null>> => {
    return errorResult("Error writing to SQS");
  };
}
