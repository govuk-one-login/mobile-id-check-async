import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { Result, emptyFailure, emptySuccess } from "../../utils/result";
import { sqsClient } from "./sqsClient";
import {
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
    const extensions = this.getExtensionsObject(
      eventConfig.redirect_uri,
      eventConfig.suspected_fraud_signal,
    );

    const event: GenericTxmaEvent = {
      user: {
        user_id: eventConfig.sub,
        session_id: eventConfig.sessionId,
        govuk_signin_journey_id: eventConfig.govukSigninJourneyId,
        transaction_id: eventConfig.transactionId,
        ip_address: eventConfig.ipAddress,
      },
      timestamp: Math.floor(timestampInMillis / 1000),
      event_timestamp_ms: timestampInMillis,
      event_name: eventConfig.eventName,
      component_id: eventConfig.componentId,
      restricted: this.getRestrictedData(eventConfig.txmaAuditEncoded),
      extensions,
    };

    return event;
  };

  private getExtensionsObject(
    redirect_uri?: string,
    suspected_fraud_signal?: string,
  ) {
    if (redirect_uri === undefined && suspected_fraud_signal === undefined) {
      return undefined;
    }

    return {
      redirect_uri,
      suspected_fraud_signal,
    };
  }

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
}
