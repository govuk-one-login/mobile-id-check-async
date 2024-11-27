import { Context, SQSEvent } from "aws-lambda";

export const lambdaHandler = async (event: SQSEvent, context: Context): Promise<void> => {
  console.log("STARTED")

  console.log(event.Records)

  console.log("COMPLETED")
}

// const input = {
//   "Records": [
//     {
//       "messageId": "059f36b4-87a3-44ab-83d2-661975830a7d",
//       "receiptHandle": "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
//       "body": "test",
//       "attributes": {
//         "ApproximateReceiveCount": "1",
//         "SentTimestamp": "1545082649183",
//         "SenderId": "AIDAIENQZJOLO23YVJ4VO",
//         "ApproximateFirstReceiveTimestamp": "1545082649185"
//       },
//       "messageAttributes": {},
//       "md5OfBody": "098f6bcd4621d373cade4e832627b4f6",
//       "eventSource": "aws:sqs",
//       "eventSourceARN": "arn:aws:sqs:eu-west-2:111122223333:my-queue",
//       "awsRegion": "eu-west-2"
//     }
//   ]
// }
