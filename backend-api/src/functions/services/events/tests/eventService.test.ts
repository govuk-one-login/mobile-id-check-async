import { EventService } from "../eventService";
import { GenericEventNames } from "../types";
import { emptyFailure, emptySuccess, Result } from "../../../utils/result";
import * as sendMessageToSqs from "../../../adapters/sqs/sendMessageToSqs";
import { SqsMessageBodies } from "../../../adapters/sqs/types";

describe("Event Service", () => {
  const eventWriter = new EventService("mockSqsQueue");

  let sendMessageToSqsMock: jest.SpyInstance<
    Promise<Result<void, void>>,
    [sqsQueue: string, message: SqsMessageBodies]
  >;
  let result: Result<void, void>;
  beforeEach(() => {
    sendMessageToSqsMock = jest
      .spyOn(sendMessageToSqs, "sendMessageToSqs")
      .mockImplementation(async () => {
        return emptySuccess();
      });
  });

  describe.each<GenericEventNames>([
    "DCMAW_ASYNC_CRI_START",
    "DCMAW_ASYNC_CRI_4XXERROR",
    "DCMAW_ASYNC_CRI_5XXERROR",
  ])("Writing generic TxMA events to SQS", (genericEventName) => {
    describe(`Given writing ${genericEventName} event to SQS fails`, () => {
      beforeEach(async () => {
        sendMessageToSqsMock = jest
          .spyOn(sendMessageToSqs, "sendMessageToSqs")
          .mockImplementation(async () => {
            return emptyFailure();
          });

        result = await eventWriter.writeGenericEvent({
          eventName: genericEventName,
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          ipAddress: "mockIpAddress",
          txmaAuditEncoded: "mockTxmaAuditEncoded",
        });
      });

      it(`Attempts to send ${genericEventName} TxMA event to SQS`, () => {
        const txmaEvent = {
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
        };

        expect(sendMessageToSqsMock).toHaveBeenCalledWith(
          "mockSqsQueue",
          txmaEvent,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe(`Given writing ${genericEventName} to SQS is successful`, () => {
      describe("Given txmaAuditEncoded is undefined", () => {
        beforeEach(async () => {
          sendMessageToSqsMock = jest
            .spyOn(sendMessageToSqs, "sendMessageToSqs")
            .mockImplementation(async () => {
              return emptySuccess();
            });

          result = await eventWriter.writeGenericEvent({
            eventName: genericEventName,
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: undefined,
          });
        });

        it(`Attempts to send ${genericEventName} event to SQS without restricted data`, () => {
          const txmaEvent = {
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
          };

          expect(sendMessageToSqsMock).toHaveBeenCalledWith(
            "mockSqsQueue",
            txmaEvent,
          );
        });

        it("Returns an emptySuccess", () => {
          expect(result).toEqual(emptySuccess());
        });
      });

      describe("Given txmaAuditEncoded is defined", () => {
        beforeEach(async () => {
          sendMessageToSqsMock = jest
            .spyOn(sendMessageToSqs, "sendMessageToSqs")
            .mockImplementation(async () => {
              return emptySuccess();
            });

          result = await eventWriter.writeGenericEvent({
            eventName: genericEventName,
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: "mockTxmaAuditEncoded",
          });
        });

        it(`Attempts to send ${genericEventName} event to SQS with restricted data`, () => {
          const txmaEvent = {
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
          };

          expect(sendMessageToSqsMock).toHaveBeenCalledWith(
            "mockSqsQueue",
            txmaEvent,
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
        sendMessageToSqsMock = jest
          .spyOn(sendMessageToSqs, "sendMessageToSqs")
          .mockImplementation(async () => {
            return emptyFailure();
          });

        result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });
      });

      it("Attempts to send DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS", () => {
        const txmaEvent = {
          event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
          component_id: "mockComponentId",
          timestamp: 1609462861,
          event_timestamp_ms: 1609462861000,
        };

        expect(sendMessageToSqsMock).toHaveBeenCalledWith(
          "mockSqsQueue",
          txmaEvent,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given writing to SQS is successful", () => {
      beforeEach(async () => {
        sendMessageToSqsMock = jest
          .spyOn(sendMessageToSqs, "sendMessageToSqs")
          .mockImplementation(async () => {
            return emptySuccess();
          });

        result = await eventWriter.writeCredentialTokenIssuedEvent({
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
        });
      });

      it("Attempts to send DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED event to SQS", () => {
        const txmaEvent = {
          event_name: "DCMAW_ASYNC_CLIENT_CREDENTIALS_TOKEN_ISSUED",
          component_id: "mockComponentId",
          timestamp: 1609462861,
          event_timestamp_ms: 1609462861000,
        };

        expect(sendMessageToSqsMock).toHaveBeenCalledWith(
          "mockSqsQueue",
          txmaEvent,
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
        sendMessageToSqsMock = jest
          .spyOn(sendMessageToSqs, "sendMessageToSqs")
          .mockImplementation(async () => {
            return emptyFailure();
          });

        result = await eventWriter.writeBiometricTokenIssuedEvent({
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          documentType: "NFC_PASSPORT",
          ipAddress: "mockIpAddress",
          txmaAuditEncoded: "mockTxmaAuditEncoded",
        });
      });

      it(`Attempts to send "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" TxMA event to SQS`, () => {
        const txmaEvent = {
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
          },
          restricted: {
            device_information: {
              encoded: "mockTxmaAuditEncoded",
            },
          },
        };

        expect(sendMessageToSqsMock).toHaveBeenCalledWith(
          "mockSqsQueue",
          txmaEvent,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe(`Given writing "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" to SQS is successful`, () => {
      describe("Given txmaAuditEncoded is undefined", () => {
        beforeEach(async () => {
          sendMessageToSqsMock = jest
            .spyOn(sendMessageToSqs, "sendMessageToSqs")
            .mockImplementation(async () => {
              return emptySuccess();
            });

          result = await eventWriter.writeBiometricTokenIssuedEvent({
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            documentType: "NFC_PASSPORT",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: undefined,
          });
        });

        it(`Attempts to send "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" event to SQS without restricted data`, () => {
          const txmaEvent = {
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
            },
          };

          expect(sendMessageToSqsMock).toHaveBeenCalledWith(
            "mockSqsQueue",
            txmaEvent,
          );
        });

        it("Returns an emptySuccess", () => {
          expect(result).toEqual(emptySuccess());
        });
      });

      describe("Given txmaAuditEncoded is defined", () => {
        beforeEach(async () => {
          sendMessageToSqsMock = jest
            .spyOn(sendMessageToSqs, "sendMessageToSqs")
            .mockImplementation(async () => {
              return emptySuccess();
            });

          result = await eventWriter.writeBiometricTokenIssuedEvent({
            sub: "mockSub",
            sessionId: "mockSessionId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            getNowInMilliseconds: () => 1609462861000,
            componentId: "mockComponentId",
            documentType: "NFC_PASSPORT",
            ipAddress: "mockIpAddress",
            txmaAuditEncoded: "mockTxmaAuditEncoded",
          });
        });

        it(`Attempts to send "DCMAW_ASYNC_BIOMETRIC_TOKEN_ISSUED" event to SQS with restricted data`, () => {
          const txmaEvent = {
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
            },
            restricted: {
              device_information: {
                encoded: "mockTxmaAuditEncoded",
              },
            },
          };

          expect(sendMessageToSqsMock).toHaveBeenCalledWith(
            "mockSqsQueue",
            txmaEvent,
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
        sendMessageToSqsMock = jest
          .spyOn(sendMessageToSqs, "sendMessageToSqs")
          .mockImplementation(async () => {
            return emptyFailure();
          });

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
        });
      });

      it(`Attempts to send biometric session finished TxMA event to SQS`, () => {
        const txmaEvent = {
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
        };

        expect(sendMessageToSqsMock).toHaveBeenCalledWith(
          "mockSqsQueue",
          txmaEvent,
        );
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe(`Given writing biometric session finished event to SQS is successful`, () => {
      beforeEach(async () => {
        sendMessageToSqsMock = jest
          .spyOn(sendMessageToSqs, "sendMessageToSqs")
          .mockImplementation(async () => {
            return emptySuccess();
          });

        result = await eventWriter.writeGenericEvent({
          sub: "mockSub",
          sessionId: "mockSessionId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          getNowInMilliseconds: () => 1609462861000,
          componentId: "mockComponentId",
          eventName: "DCMAW_ASYNC_CRI_4XXERROR",
          transactionId: "mockTransactionId",
          extensions: {
            suspected_fraud_signal: "AUTH_SESSION_NOT_FOUND",
          },
          ipAddress: undefined,
          txmaAuditEncoded: undefined,
        });
      });

      it(`Attempts to send biometric session finished event to SQS`, () => {
        const txmaEvent = {
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
            suspected_fraud_signal: "AUTH_SESSION_NOT_FOUND",
          },
        };

        expect(sendMessageToSqsMock).toHaveBeenCalledWith(
          "mockSqsQueue",
          txmaEvent,
        );
      });

      it("Returns an emptySuccess", () => {
        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
