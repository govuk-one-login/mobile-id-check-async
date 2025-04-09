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
import "../../../../../tests/testUtils/matchers";
import { GetSessionOperation } from "../../../common/session/getOperations/GetSessionOperation";
import { GetSessionBiometricTokenIssued } from "../../../common/session/getOperations/TxmaEvent/GetSessionBiometricTokenIssued";
import { SessionState } from "../../../common/session/session";
import {
  GetSessionError,
  GetSessionFailed,
  SessionRegistry,
  SessionUpdated,
  SessionUpdateFailed,
  UpdateSessionError,
} from "../../../common/session/SessionRegistry";
import { BiometricTokenIssued } from "../../../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import { UpdateSessionOperation } from "../../../common/session/updateOperations/UpdateSessionOperation";
import {
  invalidBiometricTokenIssuedSessionAttributesWrongSessionState,
  invalidBiometricTokenIssuedSessionAttributeTypes,
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBaseSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../testUtils/unitTestData";
import { errorResult, Result, successResult } from "../../../utils/result";
import { DynamoDbAdapter } from "./dynamoDbAdapter";

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

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
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
                Item: marshall({
                  clientId: "mockClientId",
                }),
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
              sessionAttributes: {
                clientId: "mockClientId",
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
      describe("Given no session attributes were returned in response", () => {
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
            .on(UpdateItemCommand, expectedUpdateItemCommandInput) // match to expected input
            .resolves({
              Attributes: undefined,
            });

          result = await sessionRegistry.updateSession(
            "mock_session_id",
            updateOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_UPDATE_SESSION_UNEXPECTED_FAILURE",
            error: "No attributes returned after successful update command",
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
            .on(UpdateItemCommand, expectedUpdateItemCommandInput) // match to expected input
            .resolves({
              Attributes: marshall(
                invalidBiometricTokenIssuedSessionAttributeTypes,
              ),
            });

          result = await sessionRegistry.updateSession(
            "mock_session_id",
            updateOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_UPDATE_SESSION_UNEXPECTED_FAILURE",
            error:
              "Could not parse valid session attributes after successful update command",
            data: {
              updateExpression: updateOperation.getDynamoDbUpdateExpression(),
              conditionExpression:
                updateOperation.getDynamoDbConditionExpression(),
            },
            sessionAttributes: invalidBiometricTokenIssuedSessionAttributeTypes,
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
    const getOperation: GetSessionOperation =
      new GetSessionBiometricTokenIssued();
    let result: Result<void, GetSessionFailed>;

    describe("On every attempt", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(GetItemCommand).resolves({});
        await sessionRegistry.getSession(mockSessionId, getOperation);
      });

      it("Logs the attempt", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SESSION_ATTEMPT",
          data: {
            sessionId: mockSessionId,
          },
        });
      });
    });

    describe("Given there is an unexpected error retrieving the session", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(GetItemCommand).rejects("mock_error");
        result = await sessionRegistry.getSession(mockSessionId, getOperation);
      });

      it("Logs the failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SESSION_UNEXPECTED_FAILURE",
        });

        const { name, message } = JSON.parse(
          consoleErrorSpy.mock.calls[0][0],
        ).error;
        expect(name).toEqual("Error");
        expect(message).toEqual("mock_error");
      });

      it("Returns failure with server error", () => {
        expect(result).toEqual(
          errorResult({
            errorType: GetSessionError.INTERNAL_SERVER_ERROR,
          }),
        );
      });
    });

    describe("Given the session was not found", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(GetItemCommand).resolves({});
        result = await sessionRegistry.getSession(mockSessionId, getOperation);
      });

      it("Logs the failure", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SESSION_SESSION_NOT_FOUND",
        });
      });

      it("Returns failure with a client error", () => {
        expect(result).toEqual(
          errorResult({
            errorType: GetSessionError.CLIENT_ERROR,
          }),
        );
      });
    });

    describe("Given the session was found", () => {
      describe("Given invalid session attribute types were returned in the response", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(GetItemCommand).resolves({
            Item: marshall(invalidBiometricTokenIssuedSessionAttributeTypes),
          });
          result = await sessionRegistry.getSession(
            mockSessionId,
            getOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_UNEXPECTED_FAILURE",
            error:
              "Session attributes missing or contains invalid attribute types",
            sessionAttributes: invalidBiometricTokenIssuedSessionAttributeTypes,
          });
        });

        it("Returns failure with a server error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: GetSessionError.INTERNAL_SERVER_ERROR,
            }),
          );
        });
      });

      describe("Given an invalid session was returned in the response (e.g. session in the wrong state)", () => {
        const invalidBiometricTokenIssuedSessionAttributesWrongSessionStateItem =
          {
            Item: marshall(
              invalidBiometricTokenIssuedSessionAttributesWrongSessionState,
            ),
          };

        beforeEach(async () => {
          mockDynamoDbClient
            .on(GetItemCommand)
            .resolves(
              invalidBiometricTokenIssuedSessionAttributesWrongSessionStateItem,
            );
          result = await sessionRegistry.getSession(
            mockSessionId,
            getOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_SESSION_INVALID",
            invalidAttributes: [
              { sessionState: SessionState.AUTH_SESSION_CREATED },
            ],
            sessionAttributes:
              invalidBiometricTokenIssuedSessionAttributesWrongSessionState,
          });
        });

        it("Returns failure with a client error", () => {
          expect(result).toStrictEqual(
            errorResult({
              errorType: GetSessionError.CLIENT_ERROR,
              data: {
                invalidAttributes: [
                  { sessionState: SessionState.AUTH_SESSION_CREATED },
                ],
                sessionAttributes:
                  invalidBiometricTokenIssuedSessionAttributesWrongSessionState,
              },
            }),
          );
        });
      });

      describe("Given a valid session was returned in the response", () => {
        beforeEach(async () => {
          mockDynamoDbClient.on(GetItemCommand).resolves({
            Item: marshall(validBiometricTokenIssuedSessionAttributes),
          });
          result = await sessionRegistry.getSession(
            mockSessionId,
            getOperation,
          );
        });

        it("Logs the success", () => {
          expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_SUCCESS",
          });
        });

        it("Returns success with session", () => {
          expect(result).toEqual(
            successResult(validBiometricTokenIssuedSessionAttributes),
          );
        });
      });
    });
  });
});
