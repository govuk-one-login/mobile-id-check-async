export const NOW_IN_MILLISECONDS: number = 1704110400000; // 2024-01-01 12:00:00.000

const passingEventNameWithSessionId = "DCMAW_ASYNC_CRI_START";
const passingEventNameWithoutSessionId =
  "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED";
const passingSessionId = "49E7D76E-D5FE-4355-B8B4-E90ACA0887C2";
const passingSessionIdUnknown = "UNKNOWN";
const failingSQSRecordMessageId = "54D7CA2F-BE1D-4D55-8F1C-9B3B501C9685";

export const passingSQSRecordKnownSessionId = {
  messageId: "E8CA2168-36C2-4CAF-8CAC-9915B849E1E5",
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventNameWithSessionId,
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

export const passingSQSRecordUnknownSessionId = {
  messageId: "235260A1-D07C-4FAA-9D85-D76E03A266BD",
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventNameWithoutSessionId,
    user: {
      session_id: passingSessionIdUnknown,
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
    pk: { S: `SESSION#${passingSessionId}` },
    sk: {
      S: `TXMA#EVENT_NAME#${passingEventNameWithSessionId}#TIMESTAMP#mockTimestamp`,
    },
    event: {
      S: JSON.stringify({
        event_name: passingEventNameWithSessionId,
        user: {
          session_id: passingSessionId,
        },
        timestamp: "mockTimestamp",
      }),
    },
    timeToLiveInSeconds: { N: "1704114000" }, // 2024-01-01 13:00:00.000
  },
};

export const putItemInputForPassingSQSRecordUnknownSessionId = {
  Item: {
    pk: { S: `SESSION#${passingSessionIdUnknown}` },
    sk: {
      S: `TXMA#EVENT_NAME#${passingEventNameWithoutSessionId}#TIMESTAMP#mockTimestamp`,
    },
    event: {
      S: JSON.stringify({
        event_name: passingEventNameWithoutSessionId,
        user: {
          session_id: passingSessionIdUnknown,
        },
        timestamp: "mockTimestamp",
      }),
    },
    timeToLiveInSeconds: { N: "1704114000" }, // 2024-01-01 13:00:00.000
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

const notAllowedEventName = "INVALID_EVENT_NAME";
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
    event_name: passingEventNameWithSessionId,
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

export const missingSessionIdInvalidSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventNameWithSessionId,
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

export const missingSessionIdValidSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventNameWithoutSessionId,
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

const invalidSessionId = "invalid-session-id";
export const invalidSessionIdSQSRecord = {
  messageId: failingSQSRecordMessageId,
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    event_name: passingEventNameWithSessionId,
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
    event_name: passingEventNameWithSessionId,
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

export const mockPutItemInput = {
  pk: "mockPk",
  sk: "mockSk",
  body: "mockBody",
  ttlDurationInSeconds: "12345",
};
