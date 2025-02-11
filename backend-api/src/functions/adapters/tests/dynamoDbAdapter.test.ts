import { expect } from "@jest/globals";
import "dotenv/config";
import "../../../../tests/testUtils/matchers";
import { DynamoDbAdapter } from "../dynamoDbAdapter";
import { BiometricTokenIssued } from "../../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import {
  SessionRegistry,
  UpdateSessionError,
  SessionUpdateFailed,
  SessionUpdated,
} from "../../common/session/SessionRegistry";
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { errorResult, Result, successResult } from "../../utils/result";
import { UpdateSessionOperation } from "../../common/session/updateOperations/UpdateSessionOperation";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  validBaseSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../testUtils/unitTestData";

const mockDynamoDbClient = mockClient(DynamoDBClient);

let sessionRegistry: SessionRegistry;
let consoleErrorSpy: jest.SpyInstance;
let consoleDebugSpy: jest.SpyInstance;

describe("DynamoDbAdapter", () => {
  beforeEach(() => {
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
});
