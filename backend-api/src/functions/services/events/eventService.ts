import { Result, emptyFailure, emptySuccess } from "../../utils/result";
import { sqsClient } from "./sqsClient";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  BiometricSessionFinishedEvent,
  BiometricSessionFinishedEventConfig,
  BiometricTokenIssuedEvent,
  BiometricTokenIssuedEventConfig,
  CredentialTokenIssuedEvent,
  CredentialTokenIssuedEventConfig,
  GenericEventConfig,
  GenericTxmaEvent,
  IEventService,
  RestrictedData,
  TxmaEvents,
} from "./types";

export class EventService implements IEventService {
  private sqsQueue: string;

  constructor(sqsQueue: string) {
    this.sqsQueue = sqsQueue;
  }

  async writeGenericEvent(
    eventConfig: GenericEventConfig,
  ): Promise<Result<void, void>> {
    const txmaEvent = this.buildGenericEvent(eventConfig);
    return await this.writeToSqs(txmaEvent);
  }

  async writeCredentialTokenIssuedEvent(
    eventConfig: CredentialTokenIssuedEventConfig,
  ): Promise<Result<void, void>> {
    const txmaEvent = this.buildCredentialTokenIssuedEvent(eventConfig);
    return await this.writeToSqs(txmaEvent);
  }

  async writeBiometricTokenIssuedEvent(
    eventConfig: BiometricTokenIssuedEventConfig,
  ): Promise<Result<void, void>> {
    const txmaEvent = this.buildBiometricTokenEvent(eventConfig);
    return await this.writeToSqs(txmaEvent);
  }

  async writeBiometricSessionFinishedEvent(
    eventConfig: BiometricSessionFinishedEventConfig,
  ): Promise<Result<void, void>> {
    const txmaEvent = this.buildBiometricSessionFinishedEvent(eventConfig);
    return await this.writeToSqs(txmaEvent);
  }

  private async writeToSqs(txmaEvent: TxmaEvents): Promise<Result<void, void>> {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.sqsQueue,
          MessageBody: JSON.stringify(txmaEvent),
        }),
      );
      return emptySuccess();
    } catch {
      return emptyFailure();
    }
  }

  private buildGenericEvent = (
    eventConfig: GenericEventConfig,
  ): GenericTxmaEvent => {
    const timestampInMillis = eventConfig.getNowInMilliseconds();
    return {
      user: {
        user_id: eventConfig.sub,
        session_id: eventConfig.sessionId,
        govuk_signin_journey_id: eventConfig.govukSigninJourneyId,
        ip_address: eventConfig.ipAddress,
      },
      timestamp: Math.floor(timestampInMillis / 1000),
      event_timestamp_ms: timestampInMillis,
      event_name: eventConfig.eventName,
      component_id: eventConfig.componentId,
      restricted: this.getRestrictedData(eventConfig.txmaAuditEncoded),
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

  private readonly buildBiometricTokenEvent = (
    eventConfig: BiometricTokenIssuedEventConfig,
  ): BiometricTokenIssuedEvent => {
    const timestampInMillis = eventConfig.getNowInMilliseconds();
    return {
      user: {
        user_id: eventConfig.sub,
        session_id: eventConfig.sessionId,
        govuk_signin_journey_id: eventConfig.govukSigninJourneyId,
        ip_address: eventConfig.ipAddress,
      },
      timestamp: Math.floor(timestampInMillis / 1000),
      event_timestamp_ms: timestampInMillis,
      event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
      component_id: eventConfig.componentId,
      extensions: {
        documentType: eventConfig.documentType,
      },
      restricted: this.getRestrictedData(eventConfig.txmaAuditEncoded),
    };
  };

  private readonly getRestrictedData = (
    txmaAuditEncoded: string | undefined,
  ): RestrictedData | undefined => {
    if (txmaAuditEncoded == null) {
      return undefined;
    }

    return {
      device_information: {
        encoded: txmaAuditEncoded,
      },
    };
  };

  private readonly buildBiometricSessionFinishedEvent = (
    eventConfig: BiometricSessionFinishedEventConfig,
  ): BiometricSessionFinishedEvent => {
    const timestampInMillis = eventConfig.getNowInMilliseconds();
    return {
      user: {
        user_id: eventConfig.sub,
        session_id: eventConfig.sessionId,
        govuk_signin_journey_id: eventConfig.govukSigninJourneyId,
        transaction_id: eventConfig.transactionId,
      },
      timestamp: Math.floor(timestampInMillis / 1000),
      event_timestamp_ms: timestampInMillis,
      event_name: eventConfig.eventName,
      component_id: eventConfig.componentId,
      extensions: eventConfig.extensions,
    };
  };
}
