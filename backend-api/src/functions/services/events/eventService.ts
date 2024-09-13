import { Result, errorResult, successResult } from "../../utils/result";
import { sqsClient } from "./sqsClient";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

export class EventService implements IEventService {
  private sqsQueue: string;

  constructor(sqsQueue: string) {
    this.sqsQueue = sqsQueue;
  }
  async writeGenericEvent(
    eventConfig: GenericEventConfig,
  ): Promise<Result<null>> {
    const txmaEvent = this.buildGenericEvent(eventConfig);
    return await this.writeToSqs(txmaEvent);
  }

  async writeCredentialTokenIssuedEvent(
    eventConfig: CredentialTokenIssuedEventConfig,
  ): Promise<Result<null>> {
    const txmaEvent = this.buildCredentialTokenIssuedEvent(eventConfig);
    return await this.writeToSqs(txmaEvent);
  }

  private async writeToSqs(
    txmaEvent: GenericTxmaEvent | CredentialTokenIssuedEvent,
  ): Promise<Result<null>> {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.sqsQueue,
          MessageBody: JSON.stringify(txmaEvent),
        }),
      );
    } catch {
      return errorResult({
        errorMessage: "Failed to write to SQS",
        errorCategory: "SERVER_ERROR",
      });
    }

    return successResult(null);
  }

  private buildGenericEvent = (
    eventConfig: GenericEventConfig,
  ): GenericTxmaEvent => {
    return {
      user: {
        user_id: eventConfig.sub,
        transaction_id: "",
        session_id: eventConfig.sessionId,
        govuk_signin_journey_id: eventConfig.govukSigninJourneyId,
      },
      timestamp: Math.floor(eventConfig.getNowInMilliseconds() / 1000),
      event_name: eventConfig.eventName,
      component_id: eventConfig.componentId,
    };
  };

  private buildCredentialTokenIssuedEvent = (
    eventConfig: CredentialTokenIssuedEventConfig,
  ): CredentialTokenIssuedEvent => {
    const timestampInMillis = eventConfig.getNowInMilliseconds();
    return {
      event_name: eventConfig.eventName,
      component_id: eventConfig.componentId,
      timestamp: Math.floor(timestampInMillis / 1000),
      event_timestamp_ms: timestampInMillis,
    };
  };
}

export interface IEventService {
  writeCredentialTokenIssuedEvent: (
    eventConfig: CredentialTokenIssuedEventConfig,
  ) => Promise<Result<null>>;
  writeGenericEvent: (eventConfig: GenericEventConfig) => Promise<Result<null>>;
}

export type GenericEventName = "DCMAW_ASYNC_CRI_START";
export type EventNames =
  | GenericEventName
  | "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";

interface GenericTxmaEvent {
  user: {
    user_id: string;
    transaction_id: string;
    session_id: string;
    govuk_signin_journey_id: string;
  };
  timestamp: number;
  event_name: GenericEventName;
  component_id: string;
}

export interface GenericEventConfig {
  eventName: GenericEventName;
  sub: string;
  sessionId: string;
  govukSigninJourneyId: string;
  getNowInMilliseconds: () => number;
  componentId: string;
}

interface CredentialTokenIssuedEvent {
  timestamp: number;
  event_timestamp_ms: number;
  event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
  component_id: string;
}

export interface CredentialTokenIssuedEventConfig {
  getNowInMilliseconds: () => number;
  componentId: string;
  eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
}
