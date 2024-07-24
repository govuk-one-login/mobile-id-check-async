import {
  ErrorOrSuccess,
  successResponse,
  errorResponse,
} from "../../../types/errorOrValue";
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
  ): Promise<ErrorOrSuccess<null>> => {
    this.auditEvents.push(eventConfig.eventName);
    return successResponse(null);
  };
  writeCredentialTokenIssuedEvent = async (
    eventConfig: CredentialTokenIssuedEventConfig,
  ): Promise<ErrorOrSuccess<null>> => {
    this.auditEvents.push(eventConfig.eventName);
    return successResponse(null);
  };
}

export class MockEventServiceFailToWrite implements IEventService {
  private eventNameToFail: EventNames;
  constructor(eventNameToFail: EventNames) {
    this.eventNameToFail = eventNameToFail;
  }
  writeGenericEvent = async (
    eventConfig: GenericEventConfig,
  ): Promise<ErrorOrSuccess<null>> => {
    if (eventConfig.eventName === this.eventNameToFail)
      return errorResponse("Error writing to SQS");
    return successResponse(null);
  };

  writeCredentialTokenIssuedEvent = async (): Promise<ErrorOrSuccess<null>> => {
    return errorResponse("Error writing to SQS");
  };
}
