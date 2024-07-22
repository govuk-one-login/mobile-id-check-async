import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../../types/errorOrValue";
import { sqsClient } from "./sqsClient";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

export class EventService implements IEventService {
  private sqsQueue: string;

  constructor(sqsQueue: string) {
    this.sqsQueue = sqsQueue;
  }
  async writeEvent(eventConfig: IEventConfig): Promise<ErrorOrSuccess<null>> {
    const txmaEvent = this.buildEvent(eventConfig);
    return await this.writeToSqs(txmaEvent);
  }

  private async writeToSqs(
    txmaEvent: ITxmaEvent,
  ): Promise<ErrorOrSuccess<null>> {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.sqsQueue,
          MessageBody: JSON.stringify(txmaEvent),
        }),
      );
    } catch (error) {
      return errorResponse("Failed to write to SQS");
    }

    return successResponse(null);
  }

  private buildEvent(eventConfig: IEventConfig): ITxmaEvent {
    return {
      user: {
        user_id: eventConfig.sub,
        transaction_id: "",
        session_id: eventConfig.sessionId,
        govuk_signin_journey_id: eventConfig.govukSigninJourneyId,
      },
      client_id: eventConfig.clientId,
      timestamp: eventConfig.getNowInMilliseconds(),
      event_name: eventConfig.eventName,
      component_id: eventConfig.componentId,
    };
  }
}

export interface IEventService {
  writeEvent: (eventConfig: IEventConfig) => Promise<ErrorOrSuccess<null>>;
}

export type EventName = "DCMAW_ASYNC_CRI_START";

interface ITxmaEvent {
  user: {
    user_id: string;
    transaction_id: string;
    session_id: string;
    govuk_signin_journey_id: string;
  };
  client_id: string;
  timestamp: number;
  event_name: EventName;
  component_id: string;
}

export interface IEventConfig extends IBaseEventConfig {
  eventName: EventName;
}

export interface IBaseEventConfig {
  sub: string;
  sessionId: string;
  govukSigninJourneyId: string;
  clientId: string;
  getNowInMilliseconds: () => number;
  componentId: string;
}
