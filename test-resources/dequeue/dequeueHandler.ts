import { SQSEvent } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent): Promise<void> => {
  console.log("STARTED");

  const records = event.Records;

  const processedEvents: ProcessedEvent[] = [];
  records.forEach((record) => {
    const { messageId } = record;
    const { event_name } = JSON.parse(record.body);

    processedEvents.push({ messageId, eventName: event_name });
  });

  console.log(processedEvents);

  console.log("COMPLETED");
};

interface ProcessedEvent {
  messageId: string;
  eventName: string;
}
