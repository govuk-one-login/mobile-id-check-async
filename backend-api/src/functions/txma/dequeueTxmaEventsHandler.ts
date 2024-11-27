import { Context, SQSEvent } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent, context: Context): Promise<void> => {
  console.log("STARTED")

  console.log(event.Records)

  console.log("COMPLETED")
}
