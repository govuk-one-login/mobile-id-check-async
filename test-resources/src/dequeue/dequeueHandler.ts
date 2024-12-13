import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  console.log("STARTED");

  const records = event.Records;

  const processedEvents: ProcessedEvent[] = [];
  const batchItemFailures: SQSBatchItemFailure[] = [];
  for (const record of records) {
    const { messageId } = record;
    let recordBody
    let eventName: string
    try {
      recordBody = JSON.parse(record.body)
      if (typeof recordBody === 'string' && recordBody.includes("error")) {
        batchItemFailures.push({ itemIdentifier: messageId })
      } else {
        eventName = recordBody.event_name;
        processedEvents.push({ messageId, eventName });
      }
    } catch (error) {
      console.log(`Failed to process message - messageId: ${messageId}`)
    }
  };
  console.log(processedEvents);

  console.log("COMPLETED");

  return Promise.resolve({ batchItemFailures })
};

interface ProcessedEvent {
  messageId: string;
  eventName: string;
}
