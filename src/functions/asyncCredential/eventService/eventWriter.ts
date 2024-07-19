import { EventName } from "../../services/events/eventWriter";
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
  async writeEvent(eventName: EventName): Promise<ErrorOrSuccess<null>> {
    return await this.writeToSqs(eventName);
  }

  private async writeToSqs(
    eventName: EventName,
  ): Promise<ErrorOrSuccess<null>> {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.sqsQueue,
          MessageBody: JSON.stringify(eventName),
        }),
      );
    } catch (error) {
      return errorResponse("Failed to write to SQS");
    }

    return successResponse(null);
  }
}

interface IEventService {
  writeEvent: (eventName: EventName) => Promise<ErrorOrSuccess<null>>;
}
