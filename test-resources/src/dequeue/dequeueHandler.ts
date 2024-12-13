import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent): Promise<void> => {
  console.log("STARTED");

  const records = event.Records;
  const processedEvents: ProcessedEvent[] = [];
  for (const record of records) {
    const { messageId } = record;

    let recordBody
    let eventName: string
    try {
      recordBody = JSON.parse(record.body)
      eventName = recordBody.event_name;
      processedEvents.push({ messageId, eventName });
      console.log(`Successfully processed message - messageId: ${messageId}`)
    } catch (error) {
      console.log(`Failed to process message - messageId: ${messageId}`)
    }
  };

  console.log(processedEvents);

  console.log("COMPLETED");
};

interface ProcessedEvent {
  messageId: string;
  eventName: string;
}

