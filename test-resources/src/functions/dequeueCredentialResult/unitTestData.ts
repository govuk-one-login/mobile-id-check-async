export const validSQSRecord = {
  messageId: "c2098377-619a-449f-b2b4-254b6c41aff4",
  receiptHandle: "mockReceiptHandle",
  body: JSON.stringify({
    sub: "mockSub",
    credentialResultBody: {
      mockKey: "mockValue",
    },
  }),
  attributes: {
    ApproximateReceiveCount: "mockApproximateReceiveCount",
    SentTimestamp: "mockSentTimestamp",
    SenderId: "mockSenderId",
    ApproximateFirstReceiveTimestamp: "mockApproximateFirstReceiveTimestamp",
  },
  messageAttributes: {},
  md5OfBody: "mockMd5OfBody",
  eventSource: "mockEventSource",
  eventSourceARN: "mockEventSourceARN",
  awsRegion: "mockAwsRegion",
};

export const failingSQSRecordBodyMissingTimestamp = {
  ...validSQSRecord,
  messageId: "6e7f7694-96ce-4248-9ee0-203c0c39d864",
  body: JSON.stringify({ sub: "mockSub", event: { mockKey: "mockValue" } }),
  attributes: { ...validSQSRecord.attributes, SentTimestamp: "" },
};

export const failingSQSRecordBodyMissing = {
  ...validSQSRecord,
  messageId: "6e00b4d2-bceb-4cf6-a447-d1d36ec8dd35",
  body: "",
};

export const failingSQSRecordBodyInvalidJSON = {
  ...validSQSRecord,
  messageId: "8e30d89a-de80-47e4-88e7-681b415a2549",
  body: "{ mockInvalidJSON",
};

export const failingSQSRecordBodyMissingSub = {
  ...validSQSRecord,
  messageId: "6f50c504-818f-4e9f-9a7f-785f532b45f2",
  body: JSON.stringify({}),
};

export const failingSQSRecordBodySubTypeInvalid = {
  ...validSQSRecord,
  messageId: "3142bffa-8323-4d27-80ff-89f7979d79f0",
  body: JSON.stringify({ sub: 12345 }),
};

export const failingSQSRecordBodyMissingEvent = {
  ...validSQSRecord,
  messageId: "6f50c504-818f-4e9f-9a7f-785f532b45f2",
  body: JSON.stringify({ sub: "mockSub" }),
};
