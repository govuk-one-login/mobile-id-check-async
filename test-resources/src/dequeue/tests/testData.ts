const passingEventName = "DCMAW_APP_HANDOFF_START";
const passingSessionId = "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2";
const failingSQSRecordMessageId = "54D7CA2F-BE1D-4D55-8F1C-9B3B501C9685";

export const passingSQSRecord = {
  messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventName,
    user: {
      session_id: passingSessionId,
    },
    timestamp: "mockTimestamp",
  }),
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};

export const putItemInputForPassingSQSRecord = {
  Item: {
    pk: { S: "SESSION#49E7D76E-D5FE-4355-B8B4-E90ACA0887C2" },
    sk: {
      S: "TXMA#EVENT_NAME#DCMAW_APP_HANDOFF_START#TIMESTAMP#mockTimestamp",
    },
    eventBody: {
      S: JSON.stringify({
        event_name: passingEventName,
        user: {
          session_id: passingSessionId,
        },
        timestamp: "mockTimestamp",
      }),
    },
    timeToLiveInSeconds: { N: "1736298000" },
  },
};

export const invalidBodySQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: "{",
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};

export const eventNameMissingSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    user: {
      session_id: "mockSessionId",
    },
    timestamp: "mockTimestamp",
  }),
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};

export const notAllowedEventName = "INVALID_EVENT_NAME";
export const eventNameNotAllowedSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: notAllowedEventName,
    user: {
      session_id: "mockSessionId",
    },
    timestamp: "mockTimestamp",
  }),
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};

export const missingUserSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventName,
    timestamp: "mockTimestamp",
  }),
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};

export const missingSessionIdSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventName,
    user: {},
    timestamp: "mockTimestamp",
  }),
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};

export const invalidSessionId = "invalid-session-id";
export const invalidSessionIdSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventName,
    user: {
      session_id: invalidSessionId,
    },
    timestamp: "mockTimestamp",
  }),
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};

export const missingTimestampSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventName,
    user: {
      session_id: passingSessionId,
    },
  }),
  attributes: {
    ApproximateReceiveCount: "1",
    SentTimestamp: "1545082649183",
    SenderId: "AIDAIENQZJOLO23YVJ4VO",
    ApproximateFirstReceiveTimestamp: "1545082649185",
  },
  messageAttributes: {},
  md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
  eventSource: "aws:sqs",
  eventSourceARN: "arn:aws:sqs:eu-west-2:111122223333:my-queue",
  awsRegion: "eu-west-2",
};
