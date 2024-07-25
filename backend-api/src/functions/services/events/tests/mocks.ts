import { error, Result, success } from "../../../types/result";
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
    return success(null);
  };
  writeCredentialTokenIssuedEvent = async (
    eventConfig: CredentialTokenIssuedEventConfig,
  ): Promise<Result<null>> => {
    this.auditEvents.push(eventConfig.eventName);
    return success(null);
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
      return error("Error writing to SQS");
    return success(null);
  };

  writeCredentialTokenIssuedEvent = async (): Promise<Result<null>> => {
    return error("Error writing to SQS");
  };
}
