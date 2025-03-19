import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  ReturnValue,
  ReturnValuesOnConditionCheckFailure,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { expect } from "@jest/globals";
import { mockClient } from "aws-sdk-client-mock";
import "../../../../../tests/testUtils/matchers";
import { GetSessionOperation } from "../../../common/session/getOperations/GetSessionOperation";
import { TxMAEvent } from "../../../common/session/getOperations/TxmaEvent/TxMAEvent";
import { SessionState } from "../../../common/session/session";
import {
  GetSessionError,
  SessionRegistry,
  GetSessionFailed,
  SessionUpdated,
  SessionUpdateFailed,
  UpdateSessionError,
} from "../../../common/session/SessionRegistry";
import { BiometricTokenIssued } from "../../../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import { UpdateSessionOperation } from "../../../common/session/updateOperations/UpdateSessionOperation";
import {
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

    describe("Session validation", () => {
      describe("Given the session attributes failed type validation", () => {
        const invalidBiometricTokenIssuedSessionAttributesWrongType = {
          ...validBiometricTokenIssuedSessionAttributes,
          sessionId: 12345,
        };

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
              Attributes: marshall(
                invalidBiometricTokenIssuedSessionAttributesWrongType,
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

      describe("Given the session is in the wrong state", () => {
        const invalidBiometricTokenIssuedSessionAttributesWrongSessionState = {
          ...validBiometricTokenIssuedSessionAttributes,
          sessionState: SessionState.AUTH_SESSION_CREATED,
        };
        const expectedUpdateItemCommandInput = {
          TableName: "mock_table_name",
          Key: {
            sessionId: { S: "mock_session_id" },
          },
          UpdateExpression: updateOperation.getDynamoDbUpdateExpression(),
          ConditionExpression: updateOperation.getDynamoDbConditionExpression(),
          ExpressionAttributeValues:
            updateOperation.getDynamoDbExpressionAttributeValues(),
          ReturnValues: ReturnValue.ALL_NEW,
          ReturnValuesOnConditionCheckFailure:
            ReturnValuesOnConditionCheckFailure.ALL_OLD,
        };
        beforeEach(async () => {
          mockDynamoDbClient
            .onAnyCommand() // default
            .rejects("Did not receive expected input")
            .on(UpdateItemCommand, expectedUpdateItemCommandInput, true) // match to expected input
            .resolves({
              Attributes: marshall(
                invalidBiometricTokenIssuedSessionAttributesWrongSessionState,
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
            error: "Session validation failed",
            data: {
              invalidAttribute: {
                sessionState: SessionState.AUTH_SESSION_CREATED,
              },
            },
          });
        });

        it("Returns failure with an invalid session error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
            }),
          );
        });
      });

      describe("Given the session is more than 60 minutes old", () => {
        const invalidBiometricTokenIssuedSessionAttributesSessionTooOld = {
          ...validBiometricTokenIssuedSessionAttributes,
          createdAt: 1704106740000, // 2024-01-01 10:59:00.000
        };

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
              Attributes: marshall(
                invalidBiometricTokenIssuedSessionAttributesSessionTooOld,
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
            error: "Session validation failed",
            data: { invalidAttribute: { createdAt: 1704106740000 } }, // 2024-01-01 10:59:00.000
          });
        });

        it("Returns failure with an invalid session error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: UpdateSessionError.INTERNAL_SERVER_ERROR,
            }),
          );
        });
      });
    });

    describe("Given the session is successfully updated", () => {
      describe("Given invalid session attributes were returned in response", () => {
        const invalidBiometricTokenIssuedSessionAttributesWrongType = {
          ...validBiometricTokenIssuedSessionAttributes,
          sessionId: 12345,
        };

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
                invalidBiometricTokenIssuedSessionAttributesWrongType,
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
    const getOperation: GetSessionOperation = new TxMAEvent();
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
            getItemCommandInput: getOperation.getDynamoDbGetCommandInput({
              tableName: "mock_table_name",
              keyValue: mockSessionId,
            }),
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
          getItemCommandInput: {
            TableName: "mock_table_name",
            Key: { sessionId: marshall(mockSessionId) },
          },
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
          errorMessage: "Session not found",
        });
      });

      it("Returns failure with an invalid session error", () => {
        expect(result).toEqual(
          errorResult({
            errorType: GetSessionError.SESSION_NOT_FOUND,
            errorMessage: "Session not found",
          }),
        );
      });
    });

    describe("Session validation", () => {
      describe("Given the session attributes failed type validation", () => {
        const invalidBiometricTokenIssuedSessionAttributesWrongType = {
          ...validBiometricTokenIssuedSessionAttributes,
          sessionState: 12345,
        };

        beforeEach(async () => {
          mockDynamoDbClient.on(GetItemCommand).resolves({
            Item: marshall(
              invalidBiometricTokenIssuedSessionAttributesWrongType,
            ),
          });
          result = await sessionRegistry.getSession(
            mockSessionId,
            getOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_SESSION_NOT_FOUND",
            errorMessage: "Session not found",
          });
        });

        it("Returns failure with server error", () => {
          expect(result).toEqual(
            errorResult({
              errorType: GetSessionError.SESSION_NOT_FOUND,
              errorMessage: "Session not found",
            }),
          );
        });
      });

      describe("Given the session is in the wrong state", () => {
        const invalidBiometricTokenIssuedSessionAttributesWrongSessionState = {
          ...validBiometricTokenIssuedSessionAttributes,
          sessionState: SessionState.AUTH_SESSION_CREATED,
        };
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
            invalidAttribute: {
              sessionState: SessionState.AUTH_SESSION_CREATED,
            },
            sessionAttributes:
              invalidBiometricTokenIssuedSessionAttributesWrongSessionState,
          });
        });

        it("Returns failure with an invalid session error", () => {
          expect(result).toStrictEqual(
            errorResult({
              errorType: GetSessionError.SESSION_INVALID,
              data: {
                invalidAttribute: {
                  sessionState: SessionState.AUTH_SESSION_CREATED,
                },
                sessionAttributes:
                  invalidBiometricTokenIssuedSessionAttributesWrongSessionState,
              },
            }),
          );
        });
      });

      describe("Given the session is more than 60 minutes old", () => {
        const invalidBiometricTokenIssuedSessionAttributesSessionTooOld = {
          ...validBiometricTokenIssuedSessionAttributes,
          createdAt: 1704106740000, // 2024-01-01 10:59:00.000
        };
        const biometricTokenIssuedSessionAttributesSessionTooOldItem = {
          Item: marshall(
            invalidBiometricTokenIssuedSessionAttributesSessionTooOld,
          ),
        };

        beforeEach(async () => {
          mockDynamoDbClient
            .on(GetItemCommand)
            .resolves(biometricTokenIssuedSessionAttributesSessionTooOldItem);
          result = await sessionRegistry.getSession(
            mockSessionId,
            getOperation,
          );
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_SESSION_INVALID",
            invalidAttribute: { createdAt: 1704106740000 }, // 2024-01-01 10:59:00.000
            sessionAttributes:
              invalidBiometricTokenIssuedSessionAttributesSessionTooOld,
          });
        });

        it("Returns failure with an invalid session error", () => {
          expect(result).toStrictEqual(
            errorResult({
              errorType: GetSessionError.SESSION_INVALID,
              data: {
                invalidAttribute: { createdAt: 1704106740000 }, // 2024-01-01 10:59:00.000
                sessionAttributes:
                  invalidBiometricTokenIssuedSessionAttributesSessionTooOld,
              },
            }),
          );
        });
      });
    });

    describe("Given the session was found", () => {
      describe("Given valid session attributes were returned in response", () => {
        const validBiometricTokenIssuedSessionAttributesItem = marshall({
          ...validBiometricTokenIssuedSessionAttributes,
          createdAt: 1704106860000, // 2024-01-01 11:01:00.000
        });

        beforeEach(async () => {
          mockDynamoDbClient.on(GetItemCommand).resolves({
            Item: validBiometricTokenIssuedSessionAttributesItem,
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
            successResult(
              unmarshall(validBiometricTokenIssuedSessionAttributesItem),
            ),
          );
        });
      });
    });
  });
});
