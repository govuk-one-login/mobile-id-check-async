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
import {
  GetSessionError,
  SessionRegistry,
  SessionRetrievalFailed,
  SessionRetrieved,
  SessionUpdated,
  SessionUpdateFailed,
  UpdateSessionError,
} from "../../common/session/SessionRegistry";
import { BiometricTokenIssued } from "../../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import { UpdateSessionOperation } from "../../common/session/updateOperations/UpdateSessionOperation";
import {
  validBaseSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../testUtils/unitTestData";
import { errorResult, Result, successResult } from "../../utils/result";
import { DynamoDbAdapter } from "../dynamoDbAdapter";

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

  describe("getSession", () => {
    let result: Result<SessionRetrieved, SessionRetrievalFailed>;

    describe("On every attempt", () => {
      beforeEach(async () => {
        mockDynamoDbClient.on(GetItemCommand).resolves({});
        await sessionRegistry.getSession("mock_session_id");
      });

      it("Logs the attempt", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_GET_SESSION_ATTEMPT",
          data: {
            Key: {
              sessionId: {
                S: "mock_session_id",
              },
            },
          },
        });
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
          data: {
            Key: {
              sessionId: {
                S: "mock_session_id",
              },
            },
          },
        });
      });

      it("Returns failure with server error", () => {
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
          mockDynamoDbClient.on(GetItemCommand).resolves({});
          result = await sessionRegistry.getSession("mock_session_id");
        });

        it("Logs the failure", () => {
          expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
            messageCode: "MOBILE_ASYNC_GET_SESSION_UNEXPECTED_FAILURE",
            data: {
              Key: {
                sessionId: {
                  S: "mock_session_id",
                },
              },
            },
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

      describe("Given valid session attributes were returned in response", () => {
        // beforeEach(async () => {
        //   mockDynamoDbClient.on(GetItemCommand).resolves({
        //     Item: marshall({
        //       clientId: "mockClientId",
        //       govukSigninJourneyId: "mockGovukSigninJourneyId",
        //       createdAt: 12345,
        //       issuer: "mockIssuer",
        //       sessionId: "mock_session_id",
        //       sessionState: SessionState.AUTH_SESSION_CREATED,
        //       clientState: "mockClientState",
        //       subjectIdentifier: "mockSubjectIdentifier",
        //       timeToLive: 12345,
        //     })
        //   }),
        //   result = await sessionRegistry.getSession(
        //     "mock_session_id",
        //   );
        // });
        // it("Logs the failure", () => {
        //   expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        //     messageCode:
        //       "MOBILE_ASYNC_GET_SESSION_CONDITIONAL_CHECK_FAILURE",
        //     error: "Conditional check failed",
        //     data: {
        //       Key: {
        //         sessionId: {
        //           S: "mock_session_id",
        //         },
        //       },
        //     },
        //   });
        // });
        // it("Returns failure with conditional check failure error", () => {
        //   expect(result).toEqual(
        //     errorResult({
        //       errorType: UpdateSessionError.CONDITIONAL_CHECK_FAILURE,
        //       attributes: validBaseSessionAttributes,
        //     }),
        //   );
        // });
      });
    });
  });
});

// interface GetSessionOperation {
//   getDynamoDbUpdateExpression(): string;
//   getDynamoDbConditionExpression(): string | undefined;
//   getDynamoDbExpressionAttributeValues(): Record<string, AttributeValue>;
//   getSessionAttributesFromDynamoDbItem(
//     item: Record<string, AttributeValue> | undefined,
//     options?: {
//       operationFailed: boolean;
//     },
//   ): Result<SessionAttributes, void>;
// }

// export const getBiometricTokenIssuedSessionAttributes = (
//   item: Record<string, AttributeValue> | undefined,
// ): Result<BiometricTokenIssuedSessionAttributes, void> => {
//   if (item == null) return emptyFailure();

//   const sessionAttributes = unmarshall(item);
//   if (!isBiometricTokenIssuedSessionAttributes(sessionAttributes))
//     return emptyFailure();

//   return successResult(sessionAttributes);
// };

// export const isBiometricTokenIssuedSessionAttributes = (
//   item: Record<string, NativeAttributeValue>,
// ): item is BiometricTokenIssuedSessionAttributes => {
//   if (typeof item.clientId !== "string") return false;
//   if (typeof item.govukSigninJourneyId !== "string") return false;
//   if (typeof item.createdAt !== "number") return false;
//   if (typeof item.issuer !== "string") return false;
//   if (typeof item.sessionId !== "string") return false;
//   if (item.sessionState !== SessionState.BIOMETRIC_TOKEN_ISSUED) return false;
//   if (typeof item.clientState !== "string") return false;
//   if (typeof item.subjectIdentifier !== "string") return false;
//   if (typeof item.timeToLive !== "number") return false;
//   if (typeof item.documentType !== "string") return false;
//   if (typeof item.opaqueId !== "string") return false;
//   if ("redirectUri" in item && typeof item.redirectUri !== "string") {
//     return false;
//   }
//   return true;
// };
