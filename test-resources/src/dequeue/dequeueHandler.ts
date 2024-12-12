import { SQSEvent } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent): Promise<void> => {
  console.log("STARTED");

  const records = event.Records;

  const processedEvents: ProcessedEvent[] = [];
  records.forEach((record) => {
    const { messageId } = record;
    let eventName
    try {
      eventName = JSON.parse(record.body).event_name;
    } catch {
      console.log("Failed to parse record body")
      return Promise.resolve()
    }

    processedEvents.push({ messageId, eventName });
  });

  console.log(processedEvents);

  console.log("COMPLETED");
};

interface ProcessedEvent {
  messageId: string;
  eventName: string;
}
