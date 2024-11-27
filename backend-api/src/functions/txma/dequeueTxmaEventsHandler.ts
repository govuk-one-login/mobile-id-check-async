import { SQSEvent } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent): Promise<void> => {
  console.log("STARTED");

  const records = event.Records;

  const events: Event[] | null = [];
  records.forEach((record) => {
    const { messageId } = record;
    const { event_name } = JSON.parse(record.body);

    events.push({ messageId, event_name });
  });

  console.log(events);

  console.log("COMPLETED");
};

interface Event {
  messageId: string;
  event_name: string;
}
