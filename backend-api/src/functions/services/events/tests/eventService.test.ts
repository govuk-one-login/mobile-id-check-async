import {
  SendMessageCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
  SQSClientResolvedConfig,
} from "@aws-sdk/client-sqs";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { emptyFailure, emptySuccess, Result } from "../../../utils/result";
import { EventService } from "../eventService";
import { sqsClient } from "../sqsClient";
import { GenericEventNames, TxmaBillingEventName } from "../types";
import {
  mockCredentialSubject,
  mockVcIssuedEvidence,
} from "../../../testUtils/unitTestData";

describe("Event Service", () => {
  const eventWriter = new EventService("mockSqsQueue");

  let sqsMock: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    SQSClientResolvedConfig
  >;
  let result: Result<void, void>;
  beforeEach(() => {
    sqsMock = mockClient(sqsClient);
  });

  describe.each<GenericEventNames | TxmaBillingEventName>([
    "DCMAW_ASYNC_CRI_START",
    "DCMAW_ASYNC_CRI_4XXERROR",
    "DCMAW_ASYNC_CRI_5XXERROR",
    "DCMAW_ASYNC_CRI_ERROR",
    "DCMAW_ASYNC_CRI_END",
    "DCMAW_ASYNC_CRI_APP_START",
    "DCMAW_ASYNC_APP_END",
    "DCMAW_ASYNC_ABORT_APP",
    "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
    "DCMAW_ASYNC_IPROOV_BILLING_STARTED",
    "DCMAW_ASYNC_READID_NFC_BILLING_STARTED",
  ])("Writing generic TxMA events to SQS", (genericEventName) => {
    describe(`Given writing ${genericEventName} event to SQS fails`, () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        result = await eventWriter.writeGenericEvent({
          eventName: genericEventName,
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          ipAddress: "mockIpAddress",
          txmaAuditEncoded: "mockTxmaAuditEncoded",
          redirect_uri: undefined,
          suspected_fraud_signal: undefined,
        });
      });

      it(`Attempts to send ${genericEventName} TxMA event to SQS`, () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
              ip_address: "mockIpAddress",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: genericEventName,
            component_id: "mockComponentId",
            restricted: {
              device_information: {
                encoded: "mockTxmaAuditEncoded",
              },
            },
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe(`Given writing ${genericEventName} to SQS is successful`, () => {
      describe("Given txmaAuditEncoded is undefined", () => {
        beforeEach(async () => {
          sqsMock.on(SendMessageCommand).resolves({});

          result = await eventWriter.writeGenericEvent({
            eventName: genericEventName,
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: undefined,
            redirect_uri: undefined,
            suspected_fraud_signal: undefined,
          });
        });

        it(`Attempts to send ${genericEventName} event to SQS without restricted data`, () => {
          const expectedCommandInput = {
            MessageBody: JSON.stringify({
              user: {
                user_id: "mockSub",
                session_id: "mockSessionId",
                govuk_signin_journey_id: "mockGovukSigninJourneyId",
                ip_address: "mockIpAddress",
              },
              timestamp: 1609462861,
              event_timestamp_ms: 1609462861000,
              event_name: genericEventName,
              component_id: "mockComponentId",
            }),
            QueueUrl: "mockSqsQueue",
          };

          expect(sqsMock).toHaveReceivedCommandWith(
            SendMessageCommand,
            expectedCommandInput,
          );
        });

        it("Returns an emptySuccess", () => {
          expect(result).toEqual(emptySuccess());
        });
      });

      describe("Given txmaAuditEncoded is defined", () => {
        beforeEach(async () => {
          sqsMock.on(SendMessageCommand).resolves({});

          result = await eventWriter.writeGenericEvent({
            eventName: genericEventName,
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: "mockTxmaAuditEncoded",
            redirect_uri: undefined,
            suspected_fraud_signal: undefined,
          });
        });

        it(`Attempts to send ${genericEventName} event to SQS with restricted data`, () => {
          const expectedCommandInput = {
            MessageBody: JSON.stringify({
              user: {
                user_id: "mockSub",
                session_id: "mockSessionId",
                govuk_signin_journey_id: "mockGovukSigninJourneyId",
                ip_address: "mockIpAddress",
              },
              timestamp: 1609462861,
              event_timestamp_ms: 1609462861000,
              event_name: genericEventName,
              component_id: "mockComponentId",
              restricted: {
                device_information: {
                  encoded: "mockTxmaAuditEncoded",
                },
              },
            }),
            QueueUrl: "mockSqsQueue",
          };

          expect(sqsMock).toHaveReceivedCommandWith(
            SendMessageCommand,
            expectedCommandInput,
          );
        });

        it("Returns an emptySuccess", () => {
          expect(result).toEqual(emptySuccess());
        });
      });
    });
  });

  describe("Writing credential token issued event to SQS", () => {
    describe("Given writing DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS fails", () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });
      });

      it("Attempts to send DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS", () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
            component_id: "mockComponentId",
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given writing to SQS is successful", () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).resolves({});

        result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });
      });

      it("Attempts to send DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS", () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
            component_id: "mockComponentId",
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an emptySuccess", () => {
        expect(result).toEqual(emptySuccess());
      });
    });
  });

  describe("Writing biometric token issued event to SQS", () => {
    describe(`Given writing "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" event to SQS fails`, () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        result = await eventWriter.writeBiometricTokenIssuedEvent({
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          documentType: "NFC_PASSPORT",
          ipAddress: "mockIpAddress",
          txmaAuditEncoded: "mockTxmaAuditEncoded",
          redirect_uri: "https://mockredirecturi.com/",
          opaqueId: "mockOpaqueId",
        });
      });

      it(`Attempts to send "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" TxMA event to SQS`, () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
              ip_address: "mockIpAddress",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
            component_id: "mockComponentId",
            extensions: {
              documentType: "NFC_PASSPORT",
              redirect_uri: "https://mockredirecturi.com/",
              opaque_id: "mockOpaqueId",
            },
            restricted: {
              device_information: {
                encoded: "mockTxmaAuditEncoded",
              },
            },
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe(`Given writing "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" to SQS is successful`, () => {
      describe("Given txmaAuditEncoded is undefined", () => {
        beforeEach(async () => {
          sqsMock.on(SendMessageCommand).resolves({});

          result = await eventWriter.writeBiometricTokenIssuedEvent({
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            documentType: "NFC_PASSPORT",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: undefined,
            redirect_uri: undefined,
            opaqueId: "mockOpaqueId",
          });
        });

        it(`Attempts to send "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" event to SQS without restricted data`, () => {
          const expectedCommandInput = {
            MessageBody: JSON.stringify({
              user: {
                user_id: "mockSub",
                session_id: "mockSessionId",
                govuk_signin_journey_id: "mockGovukSigninJourneyId",
                ip_address: "mockIpAddress",
              },
              timestamp: 1609462861,
              event_timestamp_ms: 1609462861000,
              event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
              component_id: "mockComponentId",
              extensions: {
                documentType: "NFC_PASSPORT",
                opaque_id: "mockOpaqueId",
              },
            }),
            QueueUrl: "mockSqsQueue",
          };

          expect(sqsMock).toHaveReceivedCommandWith(
            SendMessageCommand,
            expectedCommandInput,
          );
        });

        it("Returns an emptySuccess", () => {
          expect(result).toEqual(emptySuccess());
        });
      });

      describe("Given txmaAuditEncoded is defined", () => {
        beforeEach(async () => {
          sqsMock.on(SendMessageCommand).resolves({});

          result = await eventWriter.writeBiometricTokenIssuedEvent({
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            documentType: "NFC_PASSPORT",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: "mockTxmaAuditEncoded",
            redirect_uri: undefined,
            opaqueId: "mockOpaqueId",
          });
        });

        it(`Attempts to send "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" event to SQS with restricted data`, () => {
          const expectedCommandInput = {
            MessageBody: JSON.stringify({
              user: {
                user_id: "mockSub",
                session_id: "mockSessionId",
                govuk_signin_journey_id: "mockGovukSigninJourneyId",
                ip_address: "mockIpAddress",
              },
              timestamp: 1609462861,
              event_timestamp_ms: 1609462861000,
              event_name: "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED",
              component_id: "mockComponentId",
              extensions: {
                documentType: "NFC_PASSPORT",
                opaque_id: "mockOpaqueId",
              },
              restricted: {
                device_information: {
                  encoded: "mockTxmaAuditEncoded",
                },
              },
            }),
            QueueUrl: "mockSqsQueue",
          };

          expect(sqsMock).toHaveReceivedCommandWith(
            SendMessageCommand,
            expectedCommandInput,
          );
        });

        it("Returns an emptySuccess", () => {
          expect(result).toEqual(emptySuccess());
        });
      });
    });
  });

  describe("Writing biometric session finished event to SQS", () => {
    describe(`Given writing biometric session finished event to SQS fails`, () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        result = await eventWriter.writeGenericEvent({
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CRI_4XXERROR",
          transactionId: "mockTransactionId",
          ipAddress: "mockIpAddress",
          txmaAuditEncoded: undefined,
          redirect_uri: "http://www.mockRedirectUri.com",
          suspected_fraud_signal: undefined,
        });
      });

      it(`Attempts to send biometric session finished TxMA event to SQS`, () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
              transaction_id: "mockTransactionId",
              ip_address: "mockIpAddress",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: "DCMAW_ASYNC_CRI_4XXERROR",
            component_id: "mockComponentId",
            extensions: {
              redirect_uri: "http://www.mockRedirectUri.com",
            },
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe(`Given writing biometric session finished event to SQS is successful`, () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).resolves({});

        result = await eventWriter.writeGenericEvent({
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CRI_4XXERROR",
          transactionId: "mockTransactionId",
          redirect_uri: "http://www.mockRedirectUri.com",
          suspected_fraud_signal: "AUTH_SESSION_NOT_FOUND",
          ipAddress: undefined,
          txmaAuditEncoded: undefined,
        });
      });

      it(`Attempts to send biometric session finished event to SQS`, () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
              transaction_id: "mockTransactionId",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: "DCMAW_ASYNC_CRI_4XXERROR",
            component_id: "mockComponentId",
            extensions: {
              redirect_uri: "http://www.mockRedirectUri.com",
              suspected_fraud_signal: "AUTH_SESSION_NOT_FOUND",
            },
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an emptySuccess", () => {
        expect(result).toEqual(emptySuccess());
      });
    });
  });

  describe("Writing DCMAW_ASYNC_CRI_VC_ISSUED event to SQS", () => {
    describe("Given writing DCMAW_ASYNC_CRI_VC_ISSUED event to SQS fails", () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).rejects("Failed to write to SQS");

        result = await eventWriter.writeGenericEvent({
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
          transactionId: "mockTransactionId",
          redirect_uri: undefined,
          suspected_fraud_signal: undefined,
          ipAddress: "mockIpAddress",
          txmaAuditEncoded: undefined,
          evidence: mockVcIssuedEvidence,
          credentialSubject: mockCredentialSubject,
        });
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given writing DCMAW_ASYNC_CRI_VC_ISSUED event to SQS is successful", () => {
      beforeEach(async () => {
        sqsMock.on(SendMessageCommand).resolves({});

        result = await eventWriter.writeGenericEvent({
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CRI_VC_ISSUED",
          transactionId: "mockTransactionId",
          redirect_uri: undefined,
          suspected_fraud_signal: undefined,
          ipAddress: "mockIpAddress",
          txmaAuditEncoded: "mockTxmaAuditEncoded",
          evidence: mockVcIssuedEvidence,
          credentialSubject: mockCredentialSubject,
          flags: {
            dcmawFlagsPassport: {
              doBUnknown: true,
              doBMismatched: false,
            },
          },
          flaggedRecord: [
            {
              dateOfBirth: [
                { type: "ocr", value: "1990-01-01" },
                { type: "nfc", value: "1990-01-02" },
              ],
            },
          ],
        });
      });

      it("Attempts to send DCMAW_ASYNC_CRI_VC_ISSUED event to SQS", () => {
        const expectedCommandInput = {
          MessageBody: JSON.stringify({
            user: {
              user_id: "mockSub",
              session_id: "mockSessionId",
              govuk_signin_journey_id: "mockGovukSigninJourneyId",
              transaction_id: "mockTransactionId",
              ip_address: "mockIpAddress",
            },
            timestamp: 1609462861,
            event_timestamp_ms: 1609462861000,
            event_name: "DCMAW_ASYNC_CRI_VC_ISSUED",
            component_id: "mockComponentId",
            restricted: {
              device_information: {
                encoded: "mockTxmaAuditEncoded",
              },
              ...mockCredentialSubject,
              flaggedRecord: [
                {
                  dateOfBirth: [
                    { type: "ocr", value: "1990-01-01" },
                    { type: "nfc", value: "1990-01-02" },
                  ],
                },
              ],
            },
            extensions: {
              evidence: mockVcIssuedEvidence,
              dcmawFlagsPassport: {
                doBUnknown: true,
                doBMismatched: false,
              },
            },
          }),
          QueueUrl: "mockSqsQueue",
        };

        expect(sqsMock).toHaveReceivedCommandWith(
          SendMessageCommand,
          expectedCommandInput,
        );
      });

      it("Returns an emptySuccess", () => {
        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
