import { Context, SQSEvent } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent, context: Context): Promise<void> => {
  console.log("STARTED")

  const records = event.Records

  let events: Event[] | null = []
  records.forEach((record) => {
    const messageId = record.messageId
    const event_name = JSON.parse(record.body).event_name

    events.push({
      messageId,
      event_name
    })
  })

  console.log(events)

  console.log("COMPLETED")
}

interface Event {
  messageId: string
  event_name: string
}
