import { Context, SQSEvent } from "aws-lambda";
import { expect } from "@jest/globals";
import "../../../tests/testUtils/matchers";
import { buildLambdaContext } from "../testUtils/mockContext";
import { logger } from "../common/logging/logger";
import { lambdaHandlerConstructor } from "./asyncIssueBiometricCredentialHandler";
import { IssueBiometricCredentialDependencies } from "./handlerDependencies";
import {
  mockBiometricSessionId,
  mockSessionId,
} from "../testUtils/unitTestData";

describe("Async Issue Biometric Credential", () => {
  let dependencies: IssueBiometricCredentialDependencies;
  let context: Context;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  // const something = {
  //   Records: [
  //     {
  //       messageId: "8079ff88-6047-4bb4-a70c-10f50b2eb408",
  //       receiptHandle:
  //         "AQEBG06BJziw8j4UZKBssJtvT2DoD5nlkKUrsDo9sgDHOiOul4q6VP3uerDBkWAIoCLtZlInpMmWPQpqoQOaWcaERGZsLLLJf3/T5u+v7a3opHLj2rnjOQ/wQGOPIWAqKuF+R1y69bbIprZSaHL4NkkefAyf+1YBvsHs00UNhZLXKthRX3IBRSgdnEs2L1+boYdJmPr3AqJL/MWRS+FO64yNF+akwIG60t82qdkl3UyZubp7/rLG/ub76BQbW3bEFz1+AWC3ta72vyv5flEgJmIlypPKFxEAQPzNhuGbw9X6KEcCZiGaDFgz40Og2uw21BiI7iK6fDKImoe/ksikvr2xGe1JAmChrBnKdDlRdISPACYZsGr41bd9HxDRdHn9fkn1z9HrOhI3MgPY1AXaxy3sQh6OLDvGJEv7qRV751QfL2UnXAgY7sTjLmE3WhR7tUr5",
  //       body: '{"biometricSessionId":"991f6fb0-1644-4d12-9dab-bee3fd768f31","sessionId":"ee252954-387e-4d4d-aa9f-fdcdc24c0879"}',
  //       attributes: [Object],
  //       messageAttributes: {},
  //       md5OfBody: "185c07cb8193851ecf6fcda440425661",
  //       eventSource: "aws:sqs",
  //       eventSourceARN:
  //         "arn:aws:sqs:eu-west-2:211125300205:jamooney-async-backend-VendorProcessingSQS-AmqydsFMysny",
  //       awsRegion: "eu-west-2",
  //     },
  //   ],
  // };

  const sqsEvent: SQSEvent = {
    Records: [
      {
        messageId: "mockMessageId",
        receiptHandle: "mockReceiptHandle",
        body: JSON.stringify({
          biometricSessionId: mockBiometricSessionId,
          sessionId: mockSessionId,
        }),
        attributes: {
          ApproximateReceiveCount: "mockApproximateReceiveCount",
          SentTimestamp: "mockSentTimestamp",
          SenderId: "mockSenderId",
          ApproximateFirstReceiveTimestamp:
            "mockApproximateFirstReceiveTimestamp",
        },
        messageAttributes: {},
        md5OfBody: "mockMd5OfBody",
        eventSource: "mockEventSource",
        eventSourceARN: "mockEventSourceArn",
        awsRegion: "mockAwsRegion",
      },
    ],
  };

  beforeEach(() => {
    dependencies = {
      env: {},
    };
    context = buildLambdaContext();
    consoleInfoSpy = jest.spyOn(console, "info");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, sqsEvent, context);
    });

    it("Adds context and version to log attributes and logs STARTED message", () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_STARTED",
        functionVersion: "1",
        function_arn: "arn:12345",
      });
    });

    it("Clears pre-existing log attributes", async () => {
      logger.appendKeys({ testKey: "testValue" });
      await lambdaHandlerConstructor(dependencies, sqsEvent, context);

      expect(consoleInfoSpy).not.toHaveBeenCalledWithLogFields({
        testKey: "testValue",
      });
    });
  });

  describe("SQS Event validation", () => {
    describe("Given event is null or undefined", () => {
      const invalidSqsEvent = null as unknown as SQSEvent;
      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: `Event is either null or undefined.`,
        });
      });
    });

    describe("Given event is missing Records array", () => {
      const invalidSqsEvent = {} as unknown as SQSEvent;
      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: `Invalid event structure: Missing 'Records' array.`,
        });
      });
    });

    describe("Given there is not exactly one record", () => {
      const invalidSqsEvent = {
        Records: [],
      };
      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: `Expected exactly one record, got 0.`,
        });
      });
    });

    describe("Given event body cannot be parsed", () => {
      const invalidSqsEvent = {
        Records: [
          {
            messageId: "mockMessageId",
            receiptHandle: "mockReceiptHandle",
            body: undefined,
            attributes: {
              ApproximateReceiveCount: "mockApproximateReceiveCount",
              SentTimestamp: "mockSentTimestamp",
              SenderId: "mockSenderId",
              ApproximateFirstReceiveTimestamp:
                "mockApproximateFirstReceiveTimestamp",
            },
            messageAttributes: {},
            md5OfBody: "mockMd5OfBody",
            eventSource: "mockEventSource",
            eventSourceARN: "mockEventSourceArn",
            awsRegion: "mockAwsRegion",
          },
        ],
      } as unknown as SQSEvent;

      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Event body either null or undefined.",
        });
      });
    });

    describe("Given event body cannot be parsed", () => {
      const invalidSqsEvent = {
        Records: [
          {
            messageId: "mockMessageId",
            receiptHandle: "mockReceiptHandle",
            body: "invalidJson",
            attributes: {
              ApproximateReceiveCount: "mockApproximateReceiveCount",
              SentTimestamp: "mockSentTimestamp",
              SenderId: "mockSenderId",
              ApproximateFirstReceiveTimestamp:
                "mockApproximateFirstReceiveTimestamp",
            },
            messageAttributes: {},
            md5OfBody: "mockMd5OfBody",
            eventSource: "mockEventSource",
            eventSourceARN: "mockEventSourceArn",
            awsRegion: "mockAwsRegion",
          },
        ],
      };

      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage: "Failed to parse event body. Body: invalidJson",
        });
      });
    });

    describe("Given sessionId in event body is invalid", () => {
      const invalidSqsEvent = {
        Records: [
          {
            messageId: "mockMessageId",
            receiptHandle: "mockReceiptHandle",
            body: JSON.stringify({
              biometricSessionId: "mockBiometricSessionId",
              sessionId: "mockInvalidSessionId",
            }),
            attributes: {
              ApproximateReceiveCount: "mockApproximateReceiveCount",
              SentTimestamp: "mockSentTimestamp",
              SenderId: "mockSenderId",
              ApproximateFirstReceiveTimestamp:
                "mockApproximateFirstReceiveTimestamp",
            },
            messageAttributes: {},
            md5OfBody: "mockMd5OfBody",
            eventSource: "mockEventSource",
            eventSourceARN: "mockEventSourceArn",
            awsRegion: "mockAwsRegion",
          },
        ],
      };

      beforeEach(async () => {
        await lambdaHandlerConstructor(dependencies, invalidSqsEvent, context);
      });

      it("Logs INVALID_SQS_EVENT", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode:
            "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_INVALID_SQS_EVENT",
          errorMessage:
            "sessionId in request body is not a valid v4 UUID. sessionId: mockInvalidSessionId",
        });
      });
    });
  });

  describe("Given the lambda handler receives an SQSEvent", () => {
    beforeEach(async () => {
      await lambdaHandlerConstructor(dependencies, sqsEvent, context);
    });

    it("Logs COMPLETED", async () => {
      expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_ISSUE_BIOMETRIC_CREDENTIAL_COMPLETED",
      });
    });
  });
});
