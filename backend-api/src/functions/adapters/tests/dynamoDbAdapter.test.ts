import { expect } from "@jest/globals";
import "dotenv/config";
import "../../../../tests/testUtils/matchers";
import { DynamoDbAdapter } from "../dynamoDbAdapter";
import { BiometricTokenIssued } from "../../common/session/updateOperations/BiometricTokenIssued/BiometricTokenIssued";
import {
  SessionRegistry,
  UpdateSessionError,
} from "../../common/session/SessionRegistry";
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { emptySuccess, errorResult, Result } from "../../utils/result";
import { UpdateSessionOperation } from "../../common/session/updateOperations/UpdateSessionOperation";

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
    let result: Result<void, UpdateSessionError>;

    const updateOperation: UpdateSessionOperation = new BiometricTokenIssued(
      "NFC_PASSPORT",
      "mock_opaque_id",
    );

    describe("On every attempt", () => {
      beforeEach(async () => {
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
          messageCode: "MOBILE_ASYNC_UPDATE_SESSION_CONDITIONAL_CHECK_FAILURE",
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
          errorResult(UpdateSessionError.CONDITIONAL_CHECK_FAILURE),
        );
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
          errorResult(UpdateSessionError.INTERNAL_SERVER_ERROR),
        );
      });
    });

    describe("Given the session is successfully updated", () => {
      beforeEach(async () => {
        const expectedUpdateItemCommandInput = {
          TableName: "mock_table_name",
          Key: {
            sessionId: { S: "mock_session_id" },
          },
          UpdateExpression: updateOperation.getDynamoDbUpdateExpression(),
          ConditionExpression: updateOperation.getDynamoDbConditionExpression(),
          ExpressionAttributeValues:
            updateOperation.getDynamoDbExpressionAttributeValues(),
        };
        mockDynamoDbClient
          .onAnyCommand() // default
          .rejects("Did not receive expected input")
          .on(UpdateItemCommand, expectedUpdateItemCommandInput, true) // match to expected input
          .resolves({});
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

      it("Returns an empty success", () => {
        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
