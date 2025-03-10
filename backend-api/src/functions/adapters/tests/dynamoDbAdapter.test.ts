import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { expect } from "@jest/globals";
import { mockClient } from "aws-sdk-client-mock";
import "dotenv/config";
import "../../../../tests/testUtils/matchers";
import { SessionState } from "../../common/session/session";
import {
  GetSessionError,
  SessionRegistry,
  SessionRetrievalFailed,
  SessionUpdated,
  SessionUpdateFailed,
  UpdateSessionError,
} from "../../common/session/SessionRegistry";
import { BiometricTokenIssued } from "../../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import { UpdateSessionOperation } from "../../common/session/updateOperations/UpdateSessionOperation";
import {
  NOW_IN_MILLISECONDS,
  validBaseSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../testUtils/unitTestData";
import {
  emptySuccess,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { DynamoDbAdapter } from "../dynamoDbAdapter";

const mockDynamoDbClient = mockClient(DynamoDBClient);

let sessionRegistry: SessionRegistry;
let consoleErrorSpy: jest.SpyInstance;
let consoleDebugSpy: jest.SpyInstance;

describe("DynamoDbAdapter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    sessionRegistry = new DynamoDbAdapter("mock_table_name");
    consoleErrorSpy = jest.spyOn(console, "error");
    consoleDebugSpy = jest.spyOn(console, "debug");
  });

  describe("updateSession", () => {
    let result: Result<SessionUpdated, SessionUpdateFailed>;

    const updateOperation: UpdateSessionOperation = new BiometricTokenIssued(
      "NFC_PASSPORT",
      "mock_opaque_id",
    );

    describe("On every attempt", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(UpdateItemCommand).resolves({});
        await sessionRegistry.updateSession("mock_session_id", updateOperation);
      });

      it("Logs the attempt", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_UPDATE_SESSION_ATTEMPT",
          data: {
            updateExpression: updateOperation.getDynamoDbUpdateExpression(),
            conditionExpression:
              updateOperation.getDynamoDbConditionExpression(),
          },
        });
      });
    });

    describe("When a conditional check fails", () => {
      describe("Given session was not found", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(UpdateItemCommand).rejects(
            new ConditionalCheckFailedException({
              $metadata: {},
              message: "Conditional check failed",
            }),
          );
          result = await sessionRegistry.updateSession(
            "mock_session_id",
            updateOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_UPDATE_SESSION_SESSION_NOT_FOUND",
            data: {
              updateExpression: updateOperation.getDynamoDbUpdateExpression(),
              conditionExpression:
                updateOperation.getDynamoDbConditionExpression(),
            },
          });
        });

        it("Returns failure with server error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: UpdateSessionError.SESSION_NOT_FOUND,
            }),
          );
        });
      });

      describe("Given session was found", () => {
        describe("Given invalid session attributes were returned in response", () => {
          beforeEach(async () => {
            mockDynamoDbClient.on(UpdateItemCommand).rejects(
              new ConditionalCheckFailedException({
                $metadata: {},
                message: "Conditional check failed",
                Item: {},
              }),
            );
            result = await sessionRegistry.updateSession(
              "mock_session_id",
              updateOperation,
            );
          });

          it("Logs the failure", () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode: "MOBILE_ASYNC_UPDATE_SESSION_UNEXPECTED_FAILURE",
              data: {
                updateExpression: updateOperation.getDynamoDbUpdateExpression(),
                conditionExpression:
                  updateOperation.getDynamoDbConditionExpression(),
              },
            });
          });

          it("Returns failure with server error", () => {
            expect(result).toEqual(
              errorResult({
                errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
              }),
            );
          });
        });

        describe("Given valid session attributes were returned in response", () => {
          beforeEach(async () => {
            mockDynamoDbClient.on(UpdateItemCommand).rejects(
              new ConditionalCheckFailedException({
                $metadata: {},
                message: "Conditional check failed",
                Item: marshall(validBaseSessionAttributes),
              }),
            );
            result = await sessionRegistry.updateSession(
              "mock_session_id",
              updateOperation,
            );
          });

          it("Logs the failure", () => {
            expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
              messageCode:
                "MOBILE_ASYNC_UPDATE_SESSION_CONDITIONAL_CHECK_FAILURE",
              error: "Conditional check failed",
              data: {
                updateExpression: updateOperation.getDynamoDbUpdateExpression(),
                conditionExpression:
                  updateOperation.getDynamoDbConditionExpression(),
              },
            });
          });

          it("Returns failure with conditional check failure error", () => {
            expect(result).toEqual(
              errorResult({
                errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
                attributes: validBaseSessionAttributes,
              }),
            );
          });
        });
      });
    });

    describe("When there is an unexpected error updating the session", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(UpdateItemCommand).rejects("mock_error");
        result = await sessionRegistry.updateSession(
          "mock_session_id",
          updateOperation,
        );
      });

      it("Logs the failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_UPDATE_SESSION_UNEXPECTED_FAILURE",
          data: {
            updateExpression: updateOperation.getDynamoDbUpdateExpression(),
            conditionExpression:
              updateOperation.getDynamoDbConditionExpression(),
          },
        });
      });

      it("Returns failure with server error", () => {
        expect(result).toEqual(
          errorResult({
            errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
          }),
        );
      });
    });

    describe("Given the session is successfully updated", () => {
      describe("Given invalid session attributes were returned in response", () => {
        beforeEach(async () => {
          const expectedUpdateItemCommandInput = {
            TableName: "mock_table_name",
            Key: {
              sessionId: { S: "mock_session_id" },
            },
            UpdateExpression: updateOperation.getDynamoDbUpdateExpression(),
            ConditionExpression:
              updateOperation.getDynamoDbConditionExpression(),
            ExpressionAttributeValues:
              updateOperation.getDynamoDbExpressionAttributeValues(),
          };
          mockDynamoDbClient
            .onAnyCommand() // default
            .rejects("Did not receive expected input")
            .on(UpdateItemCommand, expectedUpdateItemCommandInput, true) // match to expected input
            .resolves({ Attributes: {} });
          result = await sessionRegistry.updateSession(
            "mock_session_id",
            updateOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_UPDATE_SESSION_UNEXPECTED_FAILURE",
            data: {
              updateExpression: updateOperation.getDynamoDbUpdateExpression(),
              conditionExpression:
                updateOperation.getDynamoDbConditionExpression(),
            },
          });
        });

        it("Returns failure with server error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
            }),
          );
        });
      });

      describe("Given valid session attributes were returned in response", () => {
        beforeEach(async () => {
          const expectedUpdateItemCommandInput = {
            TableName: "mock_table_name",
            Key: {
              sessionId: { S: "mock_session_id" },
            },
            UpdateExpression: updateOperation.getDynamoDbUpdateExpression(),
            ConditionExpression:
              updateOperation.getDynamoDbConditionExpression(),
            ExpressionAttributeValues:
              updateOperation.getDynamoDbExpressionAttributeValues(),
            ReturnValues: ReturnValue.ALL_NEW,
            ReturnValuesOnConditionCheckFailure:
              ReturnValuesOnConditionCheckFailure.ALL_OLD,
          };
          mockDynamoDbClient
            .onAnyCommand() // default
            .rejects("Did not receive expected input")
            .on(UpdateItemCommand, expectedUpdateItemCommandInput, true) // match to expected input
            .resolves({
              Attributes: marshall(validBiometricTokenIssuedSessionAttributes),
            });
          result = await sessionRegistry.updateSession(
            "mock_session_id",
            updateOperation,
          );
        });

        it("Logs the success", () => {
          expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_UPDATE_SESSION_SUCCESS",
          });
        });

        it("Returns a success", () => {
          expect(result).toEqual(
            successResult({
              attributes: validBiometricTokenIssuedSessionAttributes,
            }),
          );
        });
      });
    });
  });

  describe("getSession", () => {
    let result: Result<void, SessionRetrievalFailed>;

    describe("On every attempt", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(GetItemCommand).resolves({});
        await sessionRegistry.getSession("mock_session_id");
      });

      it("Logs the attempt", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SESSION_ATTEMPT",
        });
      });
    });

    describe("When there is an unexpected error retrieving the session", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(GetItemCommand).rejects("mock_error");
        result = await sessionRegistry.getSession("mock_session_id");
      });

      it("Logs the failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SESSION_UNEXPECTED_FAILURE",
        });
      });

      it("Returns failure with server error", () => {
        expect(result).toEqual(
          errorResult({
            errorType: GetSessionError.INTERNAL_SERVER_ERROR,
          }),
        );
      });
    });

    describe("Given session was not found", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(GetItemCommand).resolves({});
        result = await sessionRegistry.getSession("mock_session_id");
      });

      it("Logs the failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SESSION_SESSION_NOT_FOUND",
        });
      });

      it("Returns failure with an invalid session error", () => {
        expect(result).toEqual(
          errorResult({
            errorType: GetSessionError.SESSION_NOT_FOUND,
          }),
        );
      });
    });

    describe("Given session was found", () => {
      describe("Given invalid session attributes were returned in response", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(GetItemCommand).resolves({
            Item: marshall({
              clientId: "mockClientId",
              govukSigninJourneyId: "mockGovukSigninJourneyId",
              createdAt: 12345,
              issuer: "mockIssuer",
              sessionId: "mock_session_id",
              sessionState: SessionState.AUTH_SESSION_CREATED,
              clientState: "mockClientState",
              subjectIdentifier: "mockSubjectIdentifier",
              timeToLive: 12345,
            }),
          });
          result = await sessionRegistry.getSession("mock_session_id");
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_UNEXPECTED_FAILURE",
          });
        });

        it("Returns failure with server error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: GetSessionError.INTERNAL_SERVER_ERROR,
            }),
          );
        });
      });

      describe("Given session is more than 60 minutes old", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(GetItemCommand).resolves({
            Item: marshall({
              ...validBiometricTokenIssuedSessionAttributes,
              createdAt: 1704106740000, // 2024-01-01T10:59:00.000Z
            }),
          });
          result = await sessionRegistry.getSession("mock_session_id");
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_SESSION_TOO_OLD",
          });
        });

        it("Returns failure with an invalid session error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: GetSessionError.SESSION_NOT_FOUND,
            }),
          );
        });
      });

      describe("Given valid session attributes were returned in response", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(GetItemCommand).resolves({
            Item: marshall({
              ...validBiometricTokenIssuedSessionAttributes,
              createdAt: 1704106860000, // 2024-01-01T11:01:00.000Z
            }),
          });
          result = await sessionRegistry.getSession("mock_session_id");
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_SUCCESS",
          });
        });

        it("Returns success with null", () => {
          expect(result).toEqual(emptySuccess());
        });
      });
    });
  });
});
